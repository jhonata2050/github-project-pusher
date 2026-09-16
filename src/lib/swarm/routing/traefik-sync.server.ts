import type { ApplicationRecord, ClusterServerConfig } from "../../cloud-apps.server";
import { getActiveClusterServer } from "../../cloud-apps.server";
import { execSshCommand, getSshConnection } from "../swarm-transport.server";
import { getTemplateSubdomainPrefix, extractAppHash12 } from "../../app-subdomain";

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
      const appPrefix8 = app.id ? app.id.replace(/-/g, "").slice(0, 8) : "";
      const svcPrefix8 = app.service_id ? app.service_id.replace(/-/g, "").slice(0, 8) : "";
      const cleanId12 = app.id ? extractAppHash12(app.id) : "";
      const cleanSvc12 = app.service_id ? extractAppHash12(app.service_id) : "";

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

      if (!targetService && cleanId12) {
        targetService =
          swarmServices.find((s) => s === `app_${cleanId12}_app`) ||
          swarmServices.find((s) => s.includes(cleanId12) && !s.endsWith("_db")) ||
          "";
      }

      if (!targetService && cleanSvc12) {
        targetService =
          swarmServices.find((s) => s === `app_${cleanSvc12}_app`) ||
          swarmServices.find((s) => s.includes(cleanSvc12) && !s.endsWith("_db")) ||
          "";
      }

      if (!targetService && appPrefix8) {
        targetService =
          swarmServices.find((s) => s.includes(appPrefix8) && !s.endsWith("_db")) ||
          "";
      }

      if (!targetService && svcPrefix8) {
        targetService =
          swarmServices.find((s) => s.includes(svcPrefix8) && !s.endsWith("_db")) ||
          "";
      }

      if (!targetService) {
        console.warn(`[SwarmSync] Nenhum serviço Docker Swarm ativo encontrado para app ${app.id} (${stackName || app.name})`);
        conn.end();
        return false;
      }

      // 2. Montar domínios permitidos (Multi-Host SAN)
      const wildcard = server.wildcardDomain || "dk1.eqsam.com";
      const cleanWildcard = wildcard.replace(/^https?:\/\//i, "").replace(/\/+$/, "").trim().toLowerCase();

      const sanitize = (val?: string | null): string => {
        if (!val) return "";
        const withoutProto = val.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
        const firstPart = withoutProto.split("/")[0] ?? "";
        const withoutPort = firstPart.split(":")[0] ?? "";
        return withoutPort.trim().toLowerCase();
      };

      const templatePrefix = getTemplateSubdomainPrefix(
        app.template_id,
        app.name,
        app.build_pack
      );

      const domainCandidates: string[] = [];

      if (targetFqdn) domainCandidates.push(targetFqdn);
      if (app.fqdn) domainCandidates.push(app.fqdn);
      if (app.default_subdomain) domainCandidates.push(app.default_subdomain);
      if (app.custom_domain) domainCandidates.push(app.custom_domain);

      if (cleanId12) {
        domainCandidates.push(`${templatePrefix}-${cleanId12}.${cleanWildcard}`);
        domainCandidates.push(`app-${cleanId12}.${cleanWildcard}`);
      }

      if (cleanSvc12) {
        domainCandidates.push(`${templatePrefix}-${cleanSvc12}.${cleanWildcard}`);
        domainCandidates.push(`app-${cleanSvc12}.${cleanWildcard}`);
      }

      if (stackName) {
        const legacyHash = stackName.replace("app_", "");
        if (legacyHash) domainCandidates.push(`app-${legacyHash}.${cleanWildcard}`);
      }

      const uniqueDomains = Array.from(
        new Set(domainCandidates.map(sanitize).filter((d) => d && d.includes(".")))
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

      // 4. Se existir o compose em /opt/stacks/<stackName>/docker-compose.yml, atualizar de forma segura
      const targetStack = stackName || (targetService.startsWith("app_") ? targetService.replace(/_[^_]+$/, "") : "");
      if (targetStack) {
        const composePath = `/opt/stacks/${targetStack}/docker-compose.yml`;
        await execSshCommand(
          conn,
          `if [ -f "${composePath}" ]; then python3 -c "
import re
try:
    with open('${composePath}', 'r') as f:
        c = f.read()
    rule = '''${hostRule}'''
    c = re.sub(r'traefik\\.http\\.routers\\.[^.]+\\.rule=[^\\n\"]+', lambda m: m.group(0).split('=')[0] + '=' + rule, c)
    c = c.replace('traefik.docker.network', 'traefik.swarm.network')
    with open('${composePath}', 'w') as f:
        f.write(c)
except Exception:
    pass
" 2>/dev/null || true; fi`
        );
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
