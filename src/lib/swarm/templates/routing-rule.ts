import type { TemplateContext } from "./types";
import { getTemplateSubdomainPrefix, extractAppHash12 } from "../../app-subdomain";

/**
 * Constrói de forma determinística e blindada uma regra Traefik multi-host (SAN)
 * cobrindo TODOS os aliases possíveis da aplicação:
 * 1. O host canônico configurado (cleanHost / fqdn)
 * 2. O subdomínio do template baseado no app.id (ex: flowise-1faab31027e9.dk1.eqsam.com)
 * 3. O subdomínio do template baseado no app.service_id (ex: flowise-fd1d638f5ad6.dk1.eqsam.com)
 * 4. Os subdomínios genéricos de fallback app-{hash12}.wildcard
 * 5. Qualquer custom_domain ou default_subdomain existente
 * 6. Quaisquer hosts adicionais passados por parâmetro (ex: viewer, admin)
 *
 * Efeito de Blindagem Anti-Regressão:
 * - O Traefik SEMPRE terá a rota pronta para qualquer link que o usuário ou o painel abrir.
 * - O Let's Encrypt emite certificado TLS (SAN) cobrindo todos os subdomínios.
 * - NUNCA mais ocorre erro de SSL inválido (TRAEFIK DEFAULT CERT / NET::ERR_CERT_AUTHORITY_INVALID).
 */
export function buildTraefikHostRule(ctx: TemplateContext, extraHosts: string[] = []): string {
  const { cleanHost, wildcard, app, templateId } = ctx;
  const hosts = new Set<string>();

  const sanitizeHost = (h?: string | null): string => {
    if (!h) return "";
    const withoutProto = h.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    const firstPart = withoutProto.split("/")[0] ?? "";
    const withoutPort = firstPart.split(":")[0] ?? "";
    return withoutPort.trim().toLowerCase();
  };

  const cleanWildcard = sanitizeHost(wildcard) || "dk1.eqsam.com";

  // 1. Host principal informado no contexto
  if (cleanHost) {
    const s = sanitizeHost(cleanHost);
    if (s && s.includes(".")) hosts.add(s);
  }

  // 2. Prefixo canônico do modelo (ex: flowise, nocodb, vault, wordpress, kuma, n8n)
  const templatePrefix = getTemplateSubdomainPrefix(
    templateId || app?.template_id,
    app?.name,
    app?.build_pack || ctx.template?.build_pack
  );

  // 3. Hosts baseados no app.id
  if (app?.id) {
    const hashId = extractAppHash12(app.id);
    if (hashId) {
      hosts.add(`${templatePrefix}-${hashId}.${cleanWildcard}`);
      hosts.add(`app-${hashId}.${cleanWildcard}`);
    }
  }

  // 4. Hosts baseados no app.service_id (se houver e for diferente)
  if (app?.service_id) {
    const hashSvc = extractAppHash12(app.service_id);
    if (hashSvc) {
      hosts.add(`${templatePrefix}-${hashSvc}.${cleanWildcard}`);
      hosts.add(`app-${hashSvc}.${cleanWildcard}`);
    }
  }

  // 5. Default subdomain salvo
  if (app?.default_subdomain) {
    const d = sanitizeHost(app.default_subdomain);
    if (d && d.includes(".")) hosts.add(d);
  }

  // 6. Custom domain (domínio próprio do cliente)
  if (app?.custom_domain) {
    const c = sanitizeHost(app.custom_domain);
    if (c && c.includes(".")) hosts.add(c);
  }

  // 7. Hosts adicionais específicos passados pelo compose builder
  for (const eh of extraHosts) {
    const e = sanitizeHost(eh);
    if (e && e.includes(".")) hosts.add(e);
  }

  const validHosts = Array.from(hosts).filter(Boolean);
  if (validHosts.length === 0) {
    return `Host(\`${cleanWildcard}\`)`;
  }

  return validHosts.map((h) => `Host(\`${h}\`)`).join(" || ");
}
