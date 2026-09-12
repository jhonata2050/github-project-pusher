import type { ApplicationRecord, ClusterServerConfig } from "../cloud-apps.server";
import { getActiveClusterServer } from "../cloud-apps.server";
import { execSshCommand, getSshConnection } from "./swarm-transport.server";

/**
 * Realiza upload de buffer binário diretamente via SFTP de forma robusta e sem limite de tamanho.
 */
function uploadSftpBuffer(conn: any, remotePath: string, buffer: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.sftp((err: any, sftp: any) => {
      if (err) return reject(err);
      const writeStream = sftp.createWriteStream(remotePath);
      writeStream.on("close", () => {
        try { sftp.end(); } catch {}
        resolve();
      });
      writeStream.on("error", (wErr: any) => {
        try { sftp.end(); } catch {}
        reject(wErr);
      });
      writeStream.end(buffer);
    });
  });
}

/**
 * Sincroniza em tempo real os arquivos do Gerenciador de Arquivos para o host e container Swarm
 * Atualiza:
 * 1. Diretórios bind-mount no host (/opt/stacks/<stack>/html)
 * 2. Volumes do Docker no host (/var/lib/docker/volumes/<volume>/_data)
 * 3. Containers ativos em execução via docker cp
 */
export async function syncFilesToSwarmContainer(
  app: ApplicationRecord,
  zipBuffer: Buffer,
  serverParam?: ClusterServerConfig
): Promise<boolean> {
  try {
    const server = serverParam || (await getActiveClusterServer());
    const hasSsh = Boolean(
      (server as any).sshPort ||
      (server as any).hasSwarm ||
      (server as any).sshPassword ||
      server.serverIp === "45.159.172.137"
    );

    if (!hasSsh) return false;

    const conn = await getSshConnection(server);

    try {
      const cleanId = (app.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const stackName = (app as any).stack_name || `app_${cleanId}`;
      const tempZipPath = `/tmp/sync_${cleanId}_${Date.now()}.zip`;
      const tempExtractedPath = `/tmp/sync_${cleanId}_extracted_${Date.now()}`;

      // 1. Upload do zipBuffer via SFTP
      await new Promise<void>((resolve, reject) => {
        conn.sftp((err: any, sftp: any) => {
          if (err) return reject(err);
          const writeStream = sftp.createWriteStream(tempZipPath);
          writeStream.on("close", () => resolve());
          writeStream.on("error", (e: any) => reject(e));
          writeStream.end(zipBuffer);
        });
      });

      // 2. Extrair no diretório temporário do host
      await execSshCommand(
        conn,
        `mkdir -p "${tempExtractedPath}" && unzip -o -q "${tempZipPath}" -d "${tempExtractedPath}"`
      );

      // 3. Sincronizar diretórios de bind-mount (/opt/stacks/<stackName>/html)
      const stackHtmlDir = `/opt/stacks/${stackName}/html`;
      const cleanStackHtmlDir = `/opt/stacks/app_${cleanId}/html`;

      const bindSyncCmd = `
        if [ -d "${stackHtmlDir}" ]; then
          cp -rf ${tempExtractedPath}/* "${stackHtmlDir}/" 2>/dev/null || true
          chown -R root:root "${stackHtmlDir}" 2>/dev/null || true
        elif [ -d "/opt/stacks/${stackName}" ]; then
          mkdir -p "${stackHtmlDir}"
          cp -rf ${tempExtractedPath}/* "${stackHtmlDir}/" 2>/dev/null || true
          chown -R root:root "${stackHtmlDir}" 2>/dev/null || true
        fi

        if [ -d "${cleanStackHtmlDir}" ] && [ "${cleanStackHtmlDir}" != "${stackHtmlDir}" ]; then
          cp -rf ${tempExtractedPath}/* "${cleanStackHtmlDir}/" 2>/dev/null || true
          chown -R root:root "${cleanStackHtmlDir}" 2>/dev/null || true
        fi
      `;
      await execSshCommand(conn, bindSyncCmd);

      // 4. Sincronizar volumes do Docker no host (/var/lib/docker/volumes/)
      const findVolumesCmd = `docker volume ls --format '{{.Name}}' | grep -E "${stackName}|${cleanId}" | grep -v "_db" | grep -v "_pg" | grep -v "_redis" || true`;
      const { out: volumeListOut } = await execSshCommand(conn, findVolumesCmd);
      const volumes = volumeListOut.trim().split("\n").map((v) => v.trim()).filter(Boolean);

      for (const vol of volumes) {
        const volPath = `/var/lib/docker/volumes/${vol}/_data`;
        const volSyncCmd = `
          if [ -d "${volPath}" ]; then
            cp -rf ${tempExtractedPath}/* "${volPath}/" 2>/dev/null || true
            if echo "${vol}" | grep -qi "html"; then
              chown -R www-data:www-data "${volPath}" 2>/dev/null || true
            fi
          fi
        `;
        await execSshCommand(conn, volSyncCmd);
      }

      // 5. Copiar diretamente para containers ativos em execução via docker cp
      const { out: serviceListOut } = await execSshCommand(conn, 'docker service ls --format "{{.Name}}"');
      const swarmServices = serviceListOut.trim().split("\n").map((s) => s.trim()).filter(Boolean);
      const targetServices = swarmServices.filter(
        (s) =>
          ((stackName && s.startsWith(stackName)) || s.includes(cleanId)) &&
          !s.endsWith("_db") &&
          !s.endsWith("_pg") &&
          !s.endsWith("_redis")
      );

      for (const svc of targetServices) {
        const { out: containerId } = await execSshCommand(conn, `docker ps -q -f name=${svc} | head -n 1`);
        const cid = containerId.trim();
        if (cid) {
          const targetDir =
            app.template_id?.includes("wordpress") || (app as any).name?.toLowerCase().includes("wordpress")
              ? "/var/www/html"
              : app.template_id?.includes("n8n")
              ? "/home/node/.n8n"
              : app.template_id?.includes("kuma")
              ? "/app/data"
              : "/usr/share/caddy";

          await execSshCommand(conn, `docker exec ${cid} mkdir -p ${targetDir} 2>/dev/null || true`);
          await execSshCommand(conn, `docker cp ${tempExtractedPath}/. ${cid}:${targetDir}/ 2>/dev/null || true`);
        }
      }

      // 6. Limpeza dos arquivos temporários
      await execSshCommand(conn, `rm -rf "${tempExtractedPath}" "${tempZipPath}"`);

      conn.end();
      return true;
    } catch (innerErr: any) {
      conn.end();
      throw innerErr;
    }
  } catch (err: any) {
    console.warn(`[SwarmFileSync Error] Falha ao sincronizar arquivos para o app ${app.id}:`, err.message);
    return false;
  }
}

/**
 * Baixa os arquivos reais e originais do container/volume/bind-mount do Docker Swarm
 * para o diretório local de visualização do FileManager.
 */
export async function pullRealFilesFromSwarm(
  app: ApplicationRecord,
  targetLocalDir: string,
  serverParam?: ClusterServerConfig
): Promise<boolean> {
  try {
    const server = serverParam || (await getActiveClusterServer());
    const hasSsh = Boolean(
      (server as any).sshPort ||
      (server as any).hasSwarm ||
      (server as any).sshPassword ||
      server.serverIp === "45.159.172.137"
    );

    if (!hasSsh) return false;

    const fs = await import("fs/promises");
    const fsSync = await import("fs");
    const path = await import("path");
    const { exec } = await import("child_process");

    const conn = await getSshConnection(server);

    try {
      const cleanId = (app.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const stackName = (app as any).stack_name || `app_${cleanId}`;

      const detectCmd = `
        if [ -d "/opt/stacks/${stackName}/html" ]; then
          echo "DIR:/opt/stacks/${stackName}/html"
        elif [ -d "/opt/stacks/app_${cleanId}/html" ]; then
          echo "DIR:/opt/stacks/app_${cleanId}/html"
        elif [ -d "/opt/stacks/${stackName}" ] && [ ! -f "/opt/stacks/${stackName}/docker-compose.yml" ]; then
          echo "DIR:/opt/stacks/${stackName}"
        else
          vol=\$(docker volume ls --format '{{.Name}}' | grep -E "${cleanId}|${stackName}" | grep -v "_db" | grep -v "_pg" | grep -v "_redis" | grep -v "_mysql" | head -n 1)
          if [ -n "\$vol" ]; then
            echo "DIR:/var/lib/docker/volumes/\$vol/_data"
          else
            cid=\$(docker ps -q -f "name=${stackName}" | while read c; do
              cname=\$(docker inspect --format '{{.Name}}' "\$c" 2>/dev/null)
              if ! echo "\$cname" | grep -qiE "_db|_pg|_mysql|_redis"; then
                echo "\$c"
                break
              fi
            done | head -n 1)
            if [ -z "\$cid" ]; then
              cid=\$(docker ps -q -f "name=${cleanId}" | while read c; do
                cname=\$(docker inspect --format '{{.Name}}' "\$c" 2>/dev/null)
                if ! echo "\$cname" | grep -qiE "_db|_pg|_mysql|_redis"; then
                  echo "\$c"
                  break
                fi
              done | head -n 1)
            fi
            if [ -n "\$cid" ]; then
              echo "CID:\$cid"
            else
              echo "NONE"
            fi
          fi
        fi
      `;

      const { out: detectOut } = await execSshCommand(conn, detectCmd);
      const detected = detectOut.trim();

      if (!detected || detected === "NONE") {
        conn.end();
        return false;
      }

      const tmpTar = `/tmp/sync_pull_${cleanId}_${Date.now()}.tar.gz`;

      if (detected.startsWith("DIR:")) {
        const remoteDir = detected.replace("DIR:", "");
        await execSshCommand(conn, `cd "${remoteDir}" && tar -czf "${tmpTar}" --exclude='.git' . 2>/dev/null || true`);
      } else if (detected.startsWith("CID:")) {
        const cid = detected.replace("CID:", "");
        const targetDir =
          app.template_id?.includes("wordpress") || (app as any).name?.toLowerCase().includes("wordpress")
            ? "/var/www/html"
            : app.template_id?.includes("n8n")
            ? "/home/node/.n8n"
            : app.template_id?.includes("kuma")
            ? "/app/data"
            : "/usr/share/caddy";

        await execSshCommand(conn, `docker exec "${cid}" tar -czf "${tmpTar}" -C "${targetDir}" --exclude='.git' . 2>/dev/null || true`);
      }

      // Baixar tarball via SFTP de alta performance (fastGet)
      const localParent = path.dirname(targetLocalDir);
      await fs.mkdir(localParent, { recursive: true });
      const localTmpTar = path.resolve(localParent, `pulled_${cleanId}.tar.gz`);

      await new Promise<void>((resolve, reject) => {
        conn.sftp((err: any, sftp: any) => {
          if (err) return reject(err);
          sftp.fastGet(tmpTar, localTmpTar, (fastErr: any) => {
            if (fastErr) {
              // Fallback para streaming se fastGet falhar
              const chunks: Buffer[] = [];
              const stream = sftp.createReadStream(tmpTar);
              stream.on("data", (d: any) => chunks.push(d));
              stream.on("end", async () => {
                await fs.writeFile(localTmpTar, Buffer.concat(chunks));
                resolve();
              });
              stream.on("error", reject);
            } else {
              resolve();
            }
          });
        });
      });

      // Limpar tarball remoto
      await execSshCommand(conn, `rm -f "${tmpTar}"`);
      conn.end();

      if (!fsSync.existsSync(localTmpTar) || (await fs.stat(localTmpTar)).size === 0) {
        return false;
      }

      await fs.rm(targetLocalDir, { recursive: true, force: true });
      await fs.mkdir(targetLocalDir, { recursive: true });

      await new Promise<void>((resolve, reject) => {
        exec(`tar --force-local -xzf "${localTmpTar}" -C "${targetLocalDir}"`, (err) => {
          if (err) {
            exec(`tar -xzf "${localTmpTar}" -C "${targetLocalDir}"`, (fallbackErr) => {
              if (fallbackErr) reject(fallbackErr);
              else resolve();
            });
          } else {
            resolve();
          }
        });
      });

      await fs.unlink(localTmpTar).catch(() => {});
      await fs.writeFile(path.resolve(localParent, ".swarm_synced"), new Date().toISOString());

      return true;
    } catch (innerErr: any) {
      conn.end();
      throw innerErr;
    }
  } catch (err: any) {
    console.warn(`[SwarmPull Error] Falha ao baixar arquivos reais para ${app.id}:`, err.message);
    return false;
  }
}

/**
 * Grava um arquivo individual diretamente no bind-mount, volume e contêiner ativo no Docker Swarm.
 * Suporta arquivos de qualquer tamanho via SFTP + docker cp sem erros de buffer de comando.
 */
export async function writeRemoteSwarmFile(
  app: ApplicationRecord,
  relativePath: string,
  content: string | Buffer,
  serverParam?: ClusterServerConfig
): Promise<boolean> {
  try {
    const server = serverParam || (await getActiveClusterServer());
    const hasSsh = Boolean(
      (server as any).sshPort ||
      (server as any).hasSwarm ||
      (server as any).sshPassword ||
      server.serverIp === "45.159.172.137"
    );

    if (!hasSsh) return false;

    const conn = await getSshConnection(server);

    try {
      const cleanId = (app.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const stackName = (app as any).stack_name || `app_${cleanId}`;
      const cleanRelPath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
      const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf-8");

      // 1. Upload via SFTP para arquivo temporário (suporta qualquer tamanho sem ARG_MAX limit)
      const tmpRemote = `/tmp/sw_write_${cleanId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await uploadSftpBuffer(conn, tmpRemote, buf);

      // 2. Distribuir instantaneamente para bind mount, volumes e contêiner ativo
      const script = `
        TMP="${tmpRemote}"
        if [ ! -f "$TMP" ]; then
          exit 1
        fi

        # 1. Atualizar bind mount se existir
        for dir in "/opt/stacks/${stackName}/html" "/opt/stacks/app_${cleanId}/html" "/opt/stacks/${stackName}"; do
          if [ -d "$dir" ] && [ ! -f "$dir/docker-compose.yml" ]; then
            mkdir -p "$(dirname "$dir/${cleanRelPath}")"
            cp -f "$TMP" "$dir/${cleanRelPath}"
            chown -R root:root "$dir/${cleanRelPath}" 2>/dev/null || true
          fi
        done

        # 2. Atualizar volumes
        for vol in $(docker volume ls --format '{{.Name}}' | grep -E "${cleanId}|${stackName}" | grep -v "_db" | grep -v "_pg" | grep -v "_redis" | grep -v "_mysql"); do
          volPath="/var/lib/docker/volumes/$vol/_data"
          if [ -d "$volPath" ]; then
            mkdir -p "$(dirname "$volPath/${cleanRelPath}")"
            cp -f "$TMP" "$volPath/${cleanRelPath}"
            if echo "$vol" | grep -qi "html"; then
              chown -R www-data:www-data "$volPath/${cleanRelPath}" 2>/dev/null || true
            fi
          fi
        done

        # 3. Atualizar diretamente em container ativo (excluindo containers de DB) via docker cp
        cid=$(docker ps -q -f "name=${stackName}" | while read c; do
          cname=$(docker inspect --format '{{.Name}}' "$c" 2>/dev/null)
          if ! echo "$cname" | grep -qiE "_db|_pg|_mysql|_redis"; then
            echo "$c"
            break
          fi
        done | head -n 1)

        if [ -z "$cid" ]; then
          cid=$(docker ps -q -f "name=${cleanId}" | while read c; do
            cname=$(docker inspect --format '{{.Name}}' "$c" 2>/dev/null)
            if ! echo "$cname" | grep -qiE "_db|_pg|_mysql|_redis"; then
              echo "$c"
              break
            fi
          done | head -n 1)
        fi

        if [ -z "$cid" ]; then
          cid=$(docker ps -q | while read c; do
            cname=$(docker inspect --format '{{.Name}}' "$c" 2>/dev/null)
            if echo "$cname" | grep -qiE "${cleanId}|${stackName}" && ! echo "$cname" | grep -qiE "_db|_pg|_mysql|_redis"; then
              echo "$c"
              break
            fi
          done | head -n 1)
        fi

        if [ -n "$cid" ]; then
          for tdir in "/usr/share/caddy" "/var/www/html" "/usr/share/nginx/html" "/app/data" "/home/node/.n8n" "/app"; do
            if docker exec "$cid" test -d "$tdir" 2>/dev/null; then
              docker exec "$cid" mkdir -p "$(dirname "$tdir/${cleanRelPath}")" 2>/dev/null || true
              docker cp "$TMP" "$cid:$tdir/${cleanRelPath}" 2>/dev/null || true
              break
            fi
          done
        fi

        rm -f "$TMP"
      `;

      await execSshCommand(conn, script);
      conn.end();
      return true;
    } catch (innerErr: any) {
      conn.end();
      throw innerErr;
    }
  } catch (err: any) {
    console.warn(`[SwarmWrite Error] Falha ao gravar arquivo remoto ${relativePath} para ${app.id}:`, err.message);
    return false;
  }
}

/**
 * Remove itens diretamente no bind-mount, volume e contêiner ativo no Docker Swarm.
 */
export async function deleteRemoteSwarmItems(
  app: ApplicationRecord,
  relativePaths: string[],
  serverParam?: ClusterServerConfig
): Promise<boolean> {
  try {
    const server = serverParam || (await getActiveClusterServer());
    const hasSsh = Boolean(
      (server as any).sshPort ||
      (server as any).hasSwarm ||
      (server as any).sshPassword ||
      server.serverIp === "45.159.172.137"
    );

    if (!hasSsh) return false;

    const conn = await getSshConnection(server);

    try {
      const cleanId = (app.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const stackName = (app as any).stack_name || `app_${cleanId}`;

      for (const rel of relativePaths) {
        const cleanRel = rel.replace(/\\/g, "/").replace(/^\/+/, "");
        if (!cleanRel) continue;

        const script = `
          rm -rf "/opt/stacks/${stackName}/html/${cleanRel}" "/opt/stacks/app_${cleanId}/html/${cleanRel}" 2>/dev/null || true
          for vol in $(docker volume ls --format '{{.Name}}' | grep -E "${cleanId}|${stackName}" | grep -v "_db" | grep -v "_pg" | grep -v "_redis" | grep -v "_mysql"); do
            rm -rf "/var/lib/docker/volumes/$vol/_data/${cleanRel}" 2>/dev/null || true
          done
          cid=$(docker ps -q -f "name=${stackName}" | while read c; do
            cname=$(docker inspect --format '{{.Name}}' "$c" 2>/dev/null)
            if ! echo "$cname" | grep -qiE "_db|_pg|_mysql|_redis"; then
              echo "$c"
              break
            fi
          done | head -n 1)
          if [ -z "$cid" ]; then
            cid=$(docker ps -q -f "name=${cleanId}" | while read c; do
              cname=$(docker inspect --format '{{.Name}}' "$c" 2>/dev/null)
              if ! echo "$cname" | grep -qiE "_db|_pg|_mysql|_redis"; then
                echo "$c"
                break
              fi
            done | head -n 1)
          fi
          if [ -n "$cid" ]; then
            for tdir in "/usr/share/caddy" "/var/www/html" "/usr/share/nginx/html" "/app/data" "/home/node/.n8n" "/app"; do
              if docker exec "$cid" test -d "$tdir" 2>/dev/null; then
                docker exec "$cid" rm -rf "$tdir/${cleanRel}" 2>/dev/null || true
                break
              fi
            done
          fi
        `;
        await execSshCommand(conn, script);
      }

      conn.end();
      return true;
    } catch (innerErr: any) {
      conn.end();
      throw innerErr;
    }
  } catch (err: any) {
    console.warn(`[SwarmDelete Error] Falha ao remover itens para ${app.id}:`, err.message);
    return false;
  }
}

/**
 * Cria diretório diretamente no bind-mount, volume e contêiner ativo no Docker Swarm.
 */
export async function createRemoteSwarmDirectory(
  app: ApplicationRecord,
  relativePath: string,
  serverParam?: ClusterServerConfig
): Promise<boolean> {
  try {
    const server = serverParam || (await getActiveClusterServer());
    const hasSsh = Boolean(
      (server as any).sshPort ||
      (server as any).hasSwarm ||
      (server as any).sshPassword ||
      server.serverIp === "45.159.172.137"
    );

    if (!hasSsh) return false;

    const conn = await getSshConnection(server);

    try {
      const cleanId = (app.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const stackName = (app as any).stack_name || `app_${cleanId}`;
      const cleanRel = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");

      const script = `
        mkdir -p "/opt/stacks/${stackName}/html/${cleanRel}" "/opt/stacks/app_${cleanId}/html/${cleanRel}" 2>/dev/null || true
        for vol in $(docker volume ls --format '{{.Name}}' | grep -E "${cleanId}|${stackName}" | grep -v "_db" | grep -v "_pg" | grep -v "_redis" | grep -v "_mysql"); do
          mkdir -p "/var/lib/docker/volumes/$vol/_data/${cleanRel}" 2>/dev/null || true
        done
        cid=$(docker ps -q -f "name=${stackName}" | while read c; do
          cname=$(docker inspect --format '{{.Name}}' "$c" 2>/dev/null)
          if ! echo "$cname" | grep -qiE "_db|_pg|_mysql|_redis"; then
            echo "$c"
            break
          fi
        done | head -n 1)
        if [ -z "$cid" ]; then
          cid=$(docker ps -q -f "name=${cleanId}" | while read c; do
            cname=$(docker inspect --format '{{.Name}}' "$c" 2>/dev/null)
            if ! echo "$cname" | grep -qiE "_db|_pg|_mysql|_redis"; then
              echo "$c"
              break
            fi
          done | head -n 1)
        fi
        if [ -n "$cid" ]; then
          for tdir in "/usr/share/caddy" "/var/www/html" "/usr/share/nginx/html" "/app/data" "/home/node/.n8n" "/app"; do
            if docker exec "$cid" test -d "$tdir" 2>/dev/null; then
              docker exec "$cid" mkdir -p "$tdir/${cleanRel}" 2>/dev/null || true
              break
            fi
          done
        fi
      `;

      await execSshCommand(conn, script);
      conn.end();
      return true;
    } catch (innerErr: any) {
      conn.end();
      throw innerErr;
    }
  } catch (err: any) {
    console.warn(`[SwarmCreateDir Error] Falha ao criar diretório para ${app.id}:`, err.message);
    return false;
  }
}
