import { Buffer } from "buffer";
import { execSshCommand } from "../swarm-transport.server";
import type { ApplicationRecord, ClusterServerConfig } from "../../cloud-apps.server";

export async function runPostDeployHooks(
  conn: any,
  templateId: string,
  app: ApplicationRecord,
  server: ClusterServerConfig,
  cleanId: string,
  stackName: string,
  cleanHost: string
): Promise<void> {
  // Se for OpenStatus, inicializa o schema completo do LibSQL para que o Next.js responda 200
  if (templateId.includes("openstatus")) {
    console.log(`[runPostDeployHooks] Inicializando schema completo LibSQL para OpenStatus...`);
    try {
      // 1. Executa migrações oficiais do Drizzle via openstatus-db-migrate
      await execSshCommand(
        conn,
        `sleep 3 && docker run --rm --network ${stackName}_net_${cleanId} -e DATABASE_URL=http://db:8080 ghcr.io/openstatushq/openstatus-db-migrate:latest || true`
      );

      // 2. Garante registros essenciais de workspace, user admin inicial e páginas
      const nowSeconds = Math.floor(Date.now() / 1000);
      const sqlStatements = [
        `CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY, slug TEXT DEFAULT 'default', name TEXT DEFAULT 'Eqsam Workspace', stripe_id TEXT DEFAULT '', subscription_id TEXT DEFAULT '', plan TEXT DEFAULT 'scale', ends_at TEXT, paid_until TEXT, limits TEXT DEFAULT '{}', workos_organization_id TEXT, sso_enabled INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER, dsn TEXT);`,
        `INSERT OR IGNORE INTO workspace (id, slug, name, plan, limits, created_at, updated_at) VALUES (1, 'default', 'Eqsam Workspace', 'scale', '{}', ${nowSeconds}, ${nowSeconds});`,
        `CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY, name TEXT DEFAULT 'Admin', email TEXT DEFAULT 'ping@openstatus.dev', email_verified INTEGER, image TEXT, role TEXT DEFAULT 'owner', created_at INTEGER, updated_at INTEGER);`,
        `INSERT OR IGNORE INTO user (id, name, email, role, created_at, updated_at) VALUES (1, 'Admin', 'ping@openstatus.dev', 'owner', ${nowSeconds}, ${nowSeconds});`,
        `CREATE TABLE IF NOT EXISTS users_to_workspaces (user_id INTEGER, workspace_id INTEGER, role TEXT DEFAULT 'owner', created_at INTEGER, PRIMARY KEY (user_id, workspace_id));`,
        `INSERT OR IGNORE INTO users_to_workspaces (user_id, workspace_id, role, created_at) VALUES (1, 1, 'owner', ${nowSeconds});`,
        `CREATE TABLE IF NOT EXISTS page (id INTEGER PRIMARY KEY, workspace_id INTEGER DEFAULT 1, title TEXT DEFAULT 'OpenStatus HQ', description TEXT DEFAULT 'Todos os sistemas operacionais 24/7', icon TEXT DEFAULT '', slug TEXT, custom_domain TEXT, published INTEGER DEFAULT 1, force_theme TEXT DEFAULT 'system', custom_theme TEXT DEFAULT '{}', password TEXT DEFAULT '', password_protected INTEGER DEFAULT 0, access_type TEXT DEFAULT 'public', auth_email_domains TEXT DEFAULT '[]', allowed_ip_ranges TEXT DEFAULT '[]', homepage_url TEXT DEFAULT '', contact_url TEXT DEFAULT '', default_locale TEXT DEFAULT 'en', locales TEXT DEFAULT '["en"]', legacy_page INTEGER DEFAULT 0, configuration TEXT DEFAULT '{}', allow_index INTEGER DEFAULT 1, show_monitor_values INTEGER DEFAULT 1, created_at INTEGER, updated_at INTEGER);`,
        `CREATE TABLE IF NOT EXISTS monitor (id INTEGER PRIMARY KEY, job_type TEXT DEFAULT 'http', periodicity TEXT DEFAULT '1m', status TEXT DEFAULT 'active', active INTEGER DEFAULT 1, regions TEXT DEFAULT 'iad', url TEXT DEFAULT 'https://eqsam.com', name TEXT DEFAULT 'API Principal', external_name TEXT DEFAULT '', description TEXT DEFAULT 'Monitoramento ativo', headers TEXT DEFAULT '{}', body TEXT DEFAULT '', method TEXT DEFAULT 'GET', workspace_id INTEGER DEFAULT 1, timeout INTEGER DEFAULT 30, degraded_after INTEGER DEFAULT 1000, assertions TEXT DEFAULT '[]', otel_endpoint TEXT, otel_headers TEXT, public INTEGER DEFAULT 1, retry INTEGER DEFAULT 1, follow_redirects INTEGER DEFAULT 1, grpc_service TEXT, grpc_tls TEXT DEFAULT 'plaintext', created_at INTEGER, updated_at INTEGER, deleted_at INTEGER);`,
        `INSERT OR IGNORE INTO monitor (id, workspace_id, name, url, status, active, regions, grpc_tls, created_at, updated_at) VALUES (1, 1, 'API Principal', 'https://eqsam.com', 'active', 1, 'iad', 'plaintext', ${nowSeconds}, ${nowSeconds});`,
        `CREATE TABLE IF NOT EXISTS page_component (id INTEGER PRIMARY KEY, workspace_id INTEGER DEFAULT 1, page_id INTEGER DEFAULT 1, type TEXT DEFAULT 'monitor', monitor_id INTEGER DEFAULT 1, name TEXT DEFAULT 'Servidor Principal (DK1)', description TEXT DEFAULT '100% Online', "order" INTEGER DEFAULT 1, group_id INTEGER, group_order INTEGER DEFAULT 1, created_at INTEGER, updated_at INTEGER);`,
        `INSERT OR IGNORE INTO page_component (id, workspace_id, page_id, type, monitor_id, name, description, "order", created_at, updated_at) VALUES (1, 1, 1, 'monitor', 1, 'Servidor Principal (DK1)', '100% Online', 1, ${nowSeconds}, ${nowSeconds});`,
        `CREATE TABLE IF NOT EXISTS status_report (id INTEGER PRIMARY KEY, status TEXT DEFAULT 'resolved', title TEXT DEFAULT 'Operacional', workspace_id INTEGER DEFAULT 1, page_id INTEGER DEFAULT 1, created_at INTEGER, updated_at INTEGER);`,
        `CREATE TABLE IF NOT EXISTS status_report_update (id INTEGER PRIMARY KEY, status TEXT DEFAULT 'resolved', date TEXT DEFAULT CURRENT_TIMESTAMP, message TEXT DEFAULT 'Todos os sistemas operando normalmente', status_report_id INTEGER DEFAULT 1, created_at INTEGER, updated_at INTEGER);`,
      ];

      const slugList = [
        cleanHost,
        `${cleanHost}:80`,
        `${cleanHost}:443`,
        `openstatus-${cleanId}.${server.wildcardDomain || "dk1.eqsam.com"}`,
        `app-${cleanId}.${server.wildcardDomain || "dk1.eqsam.com"}`,
        "api",
        "status",
        "default",
      ];
      slugList.forEach((s, idx) => {
        sqlStatements.push(
          `INSERT OR REPLACE INTO page (id, workspace_id, title, description, slug, custom_domain, published, force_theme, custom_theme, default_locale, locales, configuration, auth_email_domains, allowed_ip_ranges, created_at, updated_at) VALUES (${idx + 1}, 1, '${(app.name || "OpenStatus HQ").replace(/'/g, "''")}', 'Todos os sistemas operacionais 24/7', '${s}', '${s}', 1, 'system', '{}', 'en', '["en"]', '{}', '[]', '[]', ${nowSeconds}, ${nowSeconds});`
        );
      });

      const jsonPayload = JSON.stringify({
        requests: [
          ...sqlStatements.map((sql) => ({ type: "execute", stmt: { sql } })),
          { type: "close" },
        ],
      });
      const b64 = Buffer.from(jsonPayload).toString("base64");

      await execSshCommand(
        conn,
        `sleep 2 && echo "${b64}" | base64 -d > /tmp/os_seed_${cleanId}.json && docker run --rm -v /tmp/os_seed_${cleanId}.json:/tmp/seed.json --network ${stackName}_net_${cleanId} curlimages/curl:latest -s -X POST http://db:8080/v2/pipeline -H 'Content-Type: application/json' -d @/tmp/seed.json && rm -f /tmp/os_seed_${cleanId}.json || true`
      );
    } catch (initErr: any) {
      console.warn(`[runPostDeployHooks] Erro não bloqueante ao inicializar schema LibSQL:`, initErr?.message);
    }
  }
}
