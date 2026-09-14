import type { ApplicationRecord, ClusterServerConfig } from "../../cloud-apps.server";
import { getActiveClusterServer } from "../../cloud-apps.server";
import { execSshCommand, getSshConnection } from "../swarm-transport.server";
import { uploadSftpBuffer } from "./sftp.server";

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
