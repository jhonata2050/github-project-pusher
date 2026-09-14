import type { ApplicationRecord, ClusterServerConfig } from "../../cloud-apps.server";
import { getActiveClusterServer } from "../../cloud-apps.server";
import { execSshCommand, getSshConnection } from "../swarm-transport.server";

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
