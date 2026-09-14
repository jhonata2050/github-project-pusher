import type { DeploymentRuntime } from "../../templates.data";

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
