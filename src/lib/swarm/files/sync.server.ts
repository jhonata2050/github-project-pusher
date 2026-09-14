import type { ApplicationRecord, ClusterServerConfig } from "../../cloud-apps.server";
import { getActiveClusterServer } from "../../cloud-apps.server";
import { execSshCommand, getSshConnection } from "../swarm-transport.server";

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
