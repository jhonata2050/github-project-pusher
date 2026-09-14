import type { ApplicationRecord, ClusterServerConfig } from "../../cloud-apps.server";
import { getActiveClusterServer } from "../../cloud-apps.server";
import { execSshCommand, getSshConnection } from "../swarm-transport.server";

/**
 * Sincroniza em tempo real as regras de roteamento do Traefik no Docker Swarm
 * para que o domínio ou subdomínio do modelo (ex: wordpress-..., n8n-..., kuma-...)
 * e qualquer domínio personalizado tenham certificado Let's Encrypt imediato.
 */
export async function syncSwarmDomainRouting(
  app: ApplicationRecord,
  targetFqdn?: string,
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

    if (!hasSsh) {
      return false;
    }

    const conn = await getSshConnection(server);

    try {
      // 1. Obter serviços Swarm ativos
      const { out: serviceListOut } = await execSshCommand(conn, 'docker service ls --format "{{.Name}}"');
      const swarmServices = serviceListOut.trim().split("\n").map((s) => s.trim()).filter(Boolean);

      const stackName = (app as any).stack_name;
      let targetService = "";

      if (stackName) {
        targetService =
          swarmServices.find((s) => s === `${stackName}_app`) ||
          swarmServices.find((s) => s === `${stackName}_web`) ||
          swarmServices.find((s) => s === `${stackName}_builder`) ||
          swarmServices.find((s) => s === `${stackName}_adminer`) ||
          swarmServices.find((s) => s === `${stackName}_rediscommander`) ||
          swarmServices.find((s) => s.startsWith(stackName) && !s.endsWith("_db")) ||
          "";
      }

      if (!targetService) {
        // Tentar encontrar por ID ou prefixo
        const appPrefix = app.id.slice(0, 8);
        targetService =
          swarmServices.find((s) => s.includes(appPrefix) && !s.endsWith("_db")) ||
          "";
      }

      if (!targetService) {
        console.warn(`[SwarmSync] Nenhum serviço Docker Swarm ativo encontrado para app ${app.id} (${stackName || app.name})`);
        conn.end();
        return false;
      }

      // 2. Montar domínios permitidos
      const wildcard = server.wildcardDomain || "dk1.eqsam.com";
      const primaryDomain = (targetFqdn || app.fqdn || "")
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "")
        .trim()
        .toLowerCase();

      const defaultDomain = (app.default_subdomain || "")
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "")
        .trim()
        .toLowerCase();

      const customDomain = (app.custom_domain || "")
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "")
        .trim()
        .toLowerCase();

      const legacyHash = stackName ? stackName.replace("app_", "") : "";
      const legacyDomain = legacyHash ? `app-${legacyHash}.${wildcard}` : "";

      const uniqueDomains = Array.from(
        new Set([primaryDomain, defaultDomain, customDomain, legacyDomain].filter(Boolean))
      );

      if (uniqueDomains.length === 0) {
        conn.end();
        return false;
      }

      const hostRule = uniqueDomains.map((d) => `Host(\`${d}\`)`).join(" || ");

      console.log(`[SwarmSync] Atualizando roteamento Traefik para ${targetService}: ${hostRule}`);

      // 3. Atualizar as labels do serviço no Swarm
      const routerHttp = `traefik.http.routers.${targetService}-http.rule=${hostRule}`;
      const routerHttps = `traefik.http.routers.${targetService}-https.rule=${hostRule}`;

      const updateCmd = [
        "docker service update --detach",
        `--label-add '${routerHttp}'`,
        `--label-add '${routerHttps}'`,
        "--label-rm traefik.docker.network",
        targetService,
      ].join(" ");

      await execSshCommand(conn, updateCmd);

      // 4. Se existir o compose em /opt/stacks/<stackName>/docker-compose.yml, atualizar também para persistência
      if (stackName) {
        const composePath = `/opt/stacks/${stackName}/docker-compose.yml`;
        const check = await execSshCommand(conn, `[ -f "${composePath}" ] && echo "EXISTS"`);
        if (check.out.includes("EXISTS")) {
          const escapedRule = hostRule.replace(/`/g, "\\`");
          await execSshCommand(
            conn,
            `sed -i 's|Host([^)]*)|${escapedRule}|g' "${composePath}" && sed -i 's|traefik.docker.network|traefik.swarm.network|g' "${composePath}"`
          );
        }
      }

      conn.end();
      return true;
    } catch (innerErr: any) {
      conn.end();
      throw innerErr;
    }
  } catch (err: any) {
    console.warn("[SwarmSync Warning] Falha ao sincronizar roteador no cluster Swarm:", err.message);
    return false;
  }
}
