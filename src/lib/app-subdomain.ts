/**
 * Utilitário para formatação canônica de subdomínios por modelo de aplicação
 * Formato: http://{modelo}-{hash12}.{wildcardDomain}
 * Exemplos:
 *  - http://wordpress-1faab31027e9.dk1.eqsam.com
 *  - http://caddy-463829a7305d.dk1.eqsam.com
 *  - http://n8n-a42de5c9405e.dk1.eqsam.com
 */

export function getTemplateSubdomainPrefix(
  templateId?: string | undefined,
  appName?: string | undefined,
  buildPack?: string | undefined
): string {
  const tId = (templateId || "").toLowerCase();
  const name = (appName || "").toLowerCase();

  if (tId.includes("flowise") || name.includes("flowise")) return "flowise";
  if (tId.includes("nocodb") || name.includes("nocodb")) return "nocodb";
  if (tId.includes("vaultwarden") || tId.includes("vault") || name.includes("vault")) return "vault";
  if (tId.includes("pocketbase") || name.includes("pocketbase")) return "pocketbase";
  if (tId.includes("wordpress") || name.includes("wordpress")) return "wordpress";
  if (tId.includes("caddy") || tId.includes("static") || buildPack === "static" || name.includes("caddy") || name.includes("estático") || name.includes("estatico")) return "caddy";
  if (tId.includes("n8n") || name.includes("n8n")) return "n8n";
  if (tId.includes("kuma") || tId.includes("uptime") || name.includes("kuma") || name.includes("uptime")) return "kuma";
  if (tId.includes("discord") || tId.includes("bot") || name.includes("discord") || name.includes("bot")) return "bot";
  if (tId.includes("evolution") || tId.includes("whatsapp") || name.includes("evolution") || name.includes("whatsapp")) return "evolution";
  if (tId.includes("typebot") || name.includes("typebot")) return "typebot";
  if (tId.includes("next") || name.includes("next")) return "nextjs";
  if (tId.includes("laravel") || tId.includes("php") || name.includes("laravel") || name.includes("php")) return "php";
  if (tId.includes("fastapi") || name.includes("fastapi")) return "fastapi";
  if (tId.includes("flask") || tId.includes("django") || tId.includes("python") || name.includes("python")) return "python";
  if (tId.includes("ghost") || name.includes("ghost")) return "ghost";
  if (tId.includes("go") || tId.includes("fiber") || tId.includes("gin")) return "go";
  if (tId.includes("rust") || tId.includes("actix")) return "rust";
  if (tId.includes("java") || tId.includes("spring")) return "spring";
  if (tId.includes("postgres") || name.includes("postgres")) return "postgres";
  if (tId.includes("redis") || name.includes("redis")) return "redis";
  if (tId.includes("mysql") || name.includes("mysql")) return "mysql";

  return "app";
}

export function extractAppHash12(rawId?: string | undefined): string {
  const idStr = (rawId || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  if (idStr.length >= 12) {
    return idStr.slice(0, 12);
  }
  return idStr.padEnd(12, "0");
}

export function calculateDatabasePort(cleanId: string, type: "postgres" | "mysql" | "redis"): number {
  const hashNum = parseInt(cleanId.slice(0, 4), 16) || 0;
  if (type === "postgres") return 15000 + (hashNum % 10000);
  if (type === "mysql") return 25000 + (hashNum % 10000);
  if (type === "redis") return 35000 + (hashNum % 10000);
  return 15000;
}

export function generateAppDefaultFqdn(
  app: {
    id?: string | undefined;
    service_id?: string | undefined;
    template_id?: string | undefined;
    name?: string | undefined;
    build_pack?: string | undefined;
  },
  wildcardDomain: string = "dk1.eqsam.com"
): string {
  const prefix = getTemplateSubdomainPrefix(app.template_id, app.name, app.build_pack);
  const hash = extractAppHash12(app.id || app.service_id);
  const cleanWildcard = wildcardDomain
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .trim();

  return `https://${prefix}-${hash}.${cleanWildcard}`;
}
