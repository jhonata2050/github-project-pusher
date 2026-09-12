import type { ApplicationRecord, ClusterServerConfig } from "../cloud-apps.server";
import { getActiveClusterServer } from "../cloud-apps.server";
import { execSshCommand, getSshConnection } from "./swarm-transport.server";
import type { DeploymentRuntime } from "../templates.data";

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

/**
 * Gera um Caddyfile modular, seguro e de alta performance de acordo com o runtime/deployment type da aplicação.
 * Implementa:
 * - Hardening de segurança OWASP (bloqueio de .env, .git, SQL, etc., preservando /.well-known)
 * - Anti-fingerprinting (remoção de cabeçalhos Server e X-Powered-By)
 * - Compressão inteligente zstd com fallback para gzip
 * - Cache HTTP com immutable exclusivo para assets com hash comprovado
 * - Cache moderado de 24h para assets não hashados
 * - Revalidação obrigatória para HTML (deploys imediatos)
 * - Fallback de SPA (try_files) estritamente e exclusivamente para STATIC_SPA
 */
export function generateCaddyfileForRuntime(
  runtime: DeploymentRuntime = "STATIC",
  options: {
    port?: number;
    rootDir?: string;
    proxyTarget?: string;
    hasAppService?: boolean;
  } = {}
): string {
  const rootDir = options.rootDir || "/usr/share/caddy";
  const hasApp = options.hasAppService ?? (Boolean(options.proxyTarget));
  const proxyTarget = options.proxyTarget || `app:${options.port || 3000}`;

  const securityBlock = `
	# 1. Hardening de Seguranca (OWASP / Anti-Fingerprinting)
	header {
		-Server
		-X-Powered-By
		X-Content-Type-Options "nosniff"
		X-Frame-Options "SAMEORIGIN"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "camera=(), microphone=(), geolocation=()"
	}

	# Bloqueio de arquivos sensiveis preservando /.well-known/* e permitindo *.zip
	@sensitiveFiles {
		not path /.well-known/*
		path */.* *.env* *docker-compose*.yml *docker-compose*.yaml *Caddyfile* *Dockerfile* *.sql *.sqlite* *.db *.bak *.backup
	}
	handle @sensitiveFiles {
		respond "Not Found" 404
	}
`;

  const performanceBlock = `
	# 2. Performance HTTP & Compressao
	encode zstd gzip

	# A) Assets comprovadamente versionados/hashados (Vite, Rollup, Webpack, Next.js)
	@immutableAssets path /_next/static/*
	@hashedAssets path_regexp \\.[a-fA-F0-9]{8,}\\.(js|css|png|jpg|jpeg|webp|avif|svg|woff2?)$
	@hashedHyphenAssets path_regexp -[a-fA-F0-9]{8,}\\.(js|css|png|jpg|jpeg|webp|avif|svg|woff2?)$

	header @immutableAssets Cache-Control "public, max-age=31536000, immutable"
	header @hashedAssets Cache-Control "public, max-age=31536000, immutable"
	header @hashedHyphenAssets Cache-Control "public, max-age=31536000, immutable"

	# B) Assets estaticos normais sem hash (cache moderado de 24h com revalidacao assincrona)
	@unhashedAssets {
		path *.ico *.css *.js *.png *.jpg *.jpeg *.webp *.avif *.svg *.woff *.woff2 *.ttf
		not path_regexp \\.[a-fA-F0-9]{8,}\\.
		not path_regexp -[a-fA-F0-9]{8,}\\.
		not path /_next/static/*
	}
	header @unhashedAssets Cache-Control "public, max-age=86400, stale-while-revalidate=604800"

	# C) Documentos HTML e raiz: Revalidacao obrigatoria para deploys imediatos
	@htmlDocuments path *.html /
	header @htmlDocuments Cache-Control "public, no-cache, must-revalidate"

	# D) Rotas de API: Sem cache
	@apiRoutes path /api/*
	header @apiRoutes Cache-Control "no-store, no-cache, must-revalidate"
`;

  let body = "";

  switch (runtime) {
    case "STATIC_SPA":
      body = `
	root * ${rootDir}
${securityBlock}
${performanceBlock}
	# Fallback exclusivo para Single Page Applications (React, Vue, Vite, Angular)
	handle {
		try_files {path} {path}/ /index.html
		file_server
	}
`;
      break;

    case "STATIC":
      body = `
	root * ${rootDir}
${securityBlock}
${performanceBlock}
	# Servidor estático com resolução de index.html e 404 real
	handle {
		try_files {path} {path}/index.html {path}/ =404
		file_server
	}
`;
      break;

    case "PHP":
      body = `
	root * ${rootDir}
${securityBlock}
${performanceBlock}
	handle {
		php_fastcgi php:9000
		file_server
	}
`;
      break;

    case "NEXTJS":
    case "NODE":
    case "PYTHON":
    case "DOCKER":
    case "REVERSE_PROXY":
    default:
      if (!hasApp) {
        // Sem container backend na stack: atua como servidor estático/SPA resiliente sem causar 502
        body = `
	root * ${rootDir}
${securityBlock}
${performanceBlock}
	handle {
		try_files {path} {path}/ /index.html
		file_server
	}
`;
      } else {
        body = `
${securityBlock}
${performanceBlock}
	@staticFiles file {
		root ${rootDir}
		try_files {path} {path}/index.html
	}
	handle @staticFiles {
		root * ${rootDir}
		file_server
	}

	handle {
		reverse_proxy ${proxyTarget} {
			header_up Host {host}
			header_up X-Real-IP {remote_host}
			header_up X-Forwarded-For {remote_host}
			header_up X-Forwarded-Proto {scheme}
			flush_interval -1
		}
	}
`;
      }
      break;
  }

  return `:80 {${body}}\n`;
}
