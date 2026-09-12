import type { ApplicationRecord, ClusterServerConfig } from "../cloud-apps.server";
import { getActiveClusterServer } from "../cloud-apps.server";
import { generateAppDefaultFqdn, extractAppHash12, calculateDatabasePort } from "../app-subdomain";
import { resolveDeploymentRuntime, type DeploymentRuntime } from "../templates.data";
import { generateSecureRandomSecret, isInsecureOrPlaceholderValue } from "../secret-generator";
import { execSshCommand, getSshConnection } from "./swarm-transport.server";
import { generateCaddyfileForRuntime, syncSwarmDomainRouting } from "./swarm-routing.server";

/**
 * Realiza o deploy real de uma stack de modelo no Docker Swarm com Traefik, SSL Let's Encrypt e arquivos
 */
export async function deployTemplateStackToSwarm(
  app: ApplicationRecord,
  template: {
    id?: string | undefined;
    git_repository?: string | undefined;
    git_branch?: string | undefined;
    build_pack?: "nixpacks" | "dockerfile" | "dockercompose" | "static" | undefined;
    runtime?: DeploymentRuntime | undefined;
    default_envs?: Array<{ key: string; value: string }> | undefined;
    default_port?: number | undefined;
    name?: string | undefined;
  },
  serverParam?: ClusterServerConfig | undefined
): Promise<{ success: boolean; stackName: string; fqdn: string; message?: string | undefined }> {
  try {
    const server = serverParam || (await getActiveClusterServer());
    const hasSsh = Boolean(
      (server as any).sshPort ||
      (server as any).hasSwarm ||
      (server as any).sshPassword ||
      server.serverIp === "45.159.172.137"
    );

    if (!hasSsh) {
      return { success: false, stackName: "", fqdn: "", message: "Servidor sem credenciais SSH configuradas." };
    }

    const conn = await getSshConnection(server);

    try {
      const cleanId = extractAppHash12(app.id || app.service_id);
      const stackName = `app_${cleanId}`;
      (app as any).stack_name = stackName;

      const wildcard = server.wildcardDomain || "dk1.eqsam.com";
      const defaultFqdn = generateAppDefaultFqdn(app, wildcard);
      const cleanHost = (app.fqdn || defaultFqdn).replace(/^https?:\/\//i, "").replace(/\/+$/, "");

      const templateId = (template.id || app.template_id || "").toLowerCase();
      const totalMemNum = typeof app.memory_limit === "number" && app.memory_limit > 0 ? app.memory_limit : 512;
      const totalCpuNum = typeof app.cpu_limit === "number" && app.cpu_limit > 0 ? app.cpu_limit : 0.5;

      const memLimit = `${totalMemNum}M`;
      const cpuLimit = `${totalCpuNum}`;

      // Multi-container proportional budgeting:
      // Typebot: Builder (45%), Viewer (35%), Postgres DB (20%)
      const tbBuilderMem = `${Math.max(256, Math.floor(totalMemNum * 0.45))}M`;
      const tbBuilderCpu = `${Math.max(0.2, Number((totalCpuNum * 0.45).toFixed(2)))}`;
      const tbViewerMem = `${Math.max(192, Math.floor(totalMemNum * 0.35))}M`;
      const tbViewerCpu = `${Math.max(0.15, Number((totalCpuNum * 0.35).toFixed(2)))}`;
      const tbDbMem = `${Math.max(128, Math.floor(totalMemNum * 0.20))}M`;
      const tbDbCpu = `${Math.max(0.1, Number((totalCpuNum * 0.20).toFixed(2)))}`;

      // Web Apps with DB (WordPress, N8N): App (70%), DB (30%)
      const appWpMem = `${Math.max(256, Math.floor(totalMemNum * 0.70))}M`;
      const appWpCpu = `${Math.max(0.3, Number((totalCpuNum * 0.70).toFixed(2)))}`;
      const dbWpMem = `${Math.max(256, Math.floor(totalMemNum * 0.30))}M`;
      const dbWpCpu = `${Math.max(0.2, Number((totalCpuNum * 0.30).toFixed(2)))}`;

      // Standalone DBs + Web UI (Adminer / Redis Commander): DB (80%), Web UI (20%)
      const dbMem = `${Math.max(256, Math.floor(totalMemNum * 0.80))}M`;
      const dbCpu = `${Math.max(0.3, Number((totalCpuNum * 0.80).toFixed(2)))}`;
      const adminerMem = `${Math.max(128, Math.floor(totalMemNum * 0.20))}M`;
      const adminerCpu = `${Math.max(0.1, Number((totalCpuNum * 0.20).toFixed(2)))}`;

      // OpenStatus: App (status-page), Dashboard (admin), sqld (db)
      const osAppMem = `${Math.max(512, Math.floor(totalMemNum * 0.40))}M`;
      const osAppCpu = `${Math.max(0.4, Number((totalCpuNum * 0.40).toFixed(2)))}`;
      const osDashMem = `${Math.max(512, Math.floor(totalMemNum * 0.40))}M`;
      const osDashCpu = `${Math.max(0.4, Number((totalCpuNum * 0.40).toFixed(2)))}`;
      const osDbMem = `${Math.max(128, Math.floor(totalMemNum * 0.20))}M`;
      const osDbCpu = `${Math.max(0.1, Number((totalCpuNum * 0.20).toFixed(2)))}`;

      // Diretório no host remoto Linux
      const stackDir = `/opt/stacks/${stackName}`;
      await execSshCommand(conn, `mkdir -p ${stackDir}/html ${stackDir}/data`);

      // Sincronizar arquivos do banco de dados (se houver)
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: dbFiles } = await supabaseAdmin
          .from("system_settings")
          .select("value")
          .eq("key", `app_files_${app.id}`)
          .maybeSingle();

        const fileList = typeof dbFiles?.value === "string" ? JSON.parse(dbFiles.value) : dbFiles?.value || [];
        if (Array.isArray(fileList) && fileList.length > 0) {
          for (const f of fileList) {
            if (f.content) {
              const b64 = Buffer.from(f.content).toString("base64");
              const relPath = f.name || f.path || "index.html";
              const targetPath = `${stackDir}/html/${relPath}`;
              const targetDir = targetPath.substring(0, targetPath.lastIndexOf("/"));
              await execSshCommand(conn, `mkdir -p ${targetDir} && echo "${b64}" | base64 -d > ${targetPath}`);
            }
          }
        } else {
          // Gravação de starter inteligente dependendo da stack quando não há arquivos
          if (templateId.includes("php") || templateId.includes("laravel")) {
            const starterPhp = `<?php
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${app.name} — PHP 8.3</title><style>body{font-family:system-ui;background:#030b0b;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}.card{text-align:center;padding:2.5rem;background:#071a1a;border:1px solid #0f3838;border-radius:1.5rem;max-width:520px;box-shadow:0 20px 40px rgba(0,0,0,0.5)}.tag{display:inline-block;padding:4px 14px;background:rgba(34,197,94,0.15);color:#4ade80;border-radius:9999px;font-size:0.8rem;font-weight:700;margin-bottom:1rem}h1{margin:0 0 .5rem;color:#00f5ff}p{color:#94a3b8;font-size:0.9rem}.box{background:#020707;padding:12px;border-radius:10px;font-family:monospace;color:#38bdf8;font-size:0.85rem;margin-top:1rem}</style></head><body><div class="card"><div class="tag">● Online • PHP 8.3 Apache</div><h1>${app.name}</h1><p>Ambiente PHP pronto para desenvolvimento ou deploy com suporte a rotas e mod_rewrite.</p><div class="box">PHP <?= phpversion() ?> • DocumentRoot Ativo</div></div></body></html>`;
            await execSshCommand(conn, `echo "${Buffer.from(starterPhp).toString("base64")}" | base64 -d > ${stackDir}/html/index.php`);
          } else if (templateId.includes("go") || templateId.includes("fiber") || templateId.includes("gin")) {
            const starterGo = `package main
import (
  "fmt"
  "net/http"
  "os"
)
func main() {
  port := os.Getenv("PORT")
  if port == "" { port = "3000" }
  appName := os.Getenv("APP_NAME")
  if appName == "" { appName = "${app.name}" }
  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    fmt.Fprintf(w, "{\\"status\\":\\"online\\",\\"app\\":\\"%s\\",\\"runtime\\":\\"Go 1.22 Alpine\\",\\"cluster\\":\\"DK1\\"}\\n", appName)
  })
  fmt.Printf("Servidor Go em execução na porta %s...\\n", port)
  http.ListenAndServe(":"+port, nil)
}
`;
            await execSshCommand(conn, `echo "${Buffer.from(starterGo).toString("base64")}" | base64 -d > ${stackDir}/html/main.go`);
          } else if (templateId.includes("python") || templateId.includes("fastapi") || templateId.includes("flask") || templateId.includes("django")) {
            const isFastApi = templateId.includes("fastapi");
            const portNum = isFastApi ? 8000 : 5000;
            const starterPy = `import os
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

port = int(os.environ.get("PORT", ${portNum}))
app_name = os.environ.get("APP_NAME", "${app.name}")

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        data = {
            "status": "online",
            "app": app_name,
            "runtime": "Python 3.11 Slim",
            "cluster": "DK1 Swarm"
        }
        self.wfile.write(json.dumps(data, indent=2).encode("utf-8"))

print(f"Servidor Python ativo na porta {port}")
HTTPServer(("0.0.0.0", port), Handler).serve_forever()
`;
            await execSshCommand(conn, `echo "${Buffer.from(starterPy).toString("base64")}" | base64 -d > ${stackDir}/html/main.py`);
          } else if (templateId.includes("java") || templateId.includes("spring")) {
            const starterJava = `import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.io.OutputStream;

public class Main {
    public static void main(String[] args) throws Exception {
        int port = 8080;
        try {
            String p = System.getenv("PORT");
            if (p != null) port = Integer.parseInt(p);
        } catch (Exception ignored) {}
        String appName = System.getenv().getOrDefault("APP_NAME", "${app.name}");

        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", exchange -> {
            String resp = "{\\"status\\":\\"online\\",\\"app\\":\\"" + appName + "\\",\\"runtime\\":\\"Java 21 Temurin OpenJDK\\"}\\n";
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, resp.getBytes().length);
            OutputStream os = exchange.getResponseBody();
            os.write(resp.getBytes());
            os.close();
        });
        System.out.println("Servidor Java 21 rodando na porta " + port);
        server.start();
    }
}
`;
            await execSshCommand(conn, `echo "${Buffer.from(starterJava).toString("base64")}" | base64 -d > ${stackDir}/html/Main.java`);
          } else if (templateId.includes("rust") || templateId.includes("actix")) {
            const starterRustCargo = `[package]
name = "rust_app"
version = "0.1.0"
edition = "2021"

[dependencies]
`;
            const starterRustMain = `use std::io::prelude::*;
use std::net::TcpListener;

fn main() {
    let listener = TcpListener::bind("0.0.0.0:8080").unwrap();
    println!("Servidor Rust ativo na porta 8080...");
    for stream in listener.incoming() {
        if let Ok(mut stream) = stream {
            let response = "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n{\\"status\\":\\"online\\",\\"app\\":\\"${app.name}\\",\\"runtime\\":\\"Rust 1.80 Alpine\\"}";
            let _ = stream.write_all(response.as_bytes());
        }
    }
}
`;
            await execSshCommand(conn, `mkdir -p ${stackDir}/html/src && echo "${Buffer.from(starterRustCargo).toString("base64")}" | base64 -d > ${stackDir}/html/Cargo.toml && echo "${Buffer.from(starterRustMain).toString("base64")}" | base64 -d > ${stackDir}/html/src/main.rs`);
          } else if (templateId.includes("discord")) {
            const starterPkg = JSON.stringify({
              name: "discord-bot-starter",
              version: "1.0.0",
              main: "index.js",
              scripts: { start: "node index.js" },
              dependencies: {}
            }, null, 2);
            const starterBot = `const http = require('http');
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: process.env.APP_NAME || '${app.name}',
    mode: 'Worker Background Ativo',
    uptime: Math.floor(process.uptime()) + 's'
  }));
});
server.listen(port, () => {
  console.log('[Discord Bot Worker] Healthcheck HTTP ativo na porta ' + port);
  console.log('[Discord Bot Worker] Para conectar à API do Discord, defina a variável DISCORD_TOKEN na aba Variáveis (.env).');
});
`;
            await execSshCommand(conn, `echo "${Buffer.from(starterPkg).toString("base64")}" | base64 -d > ${stackDir}/html/package.json && echo "${Buffer.from(starterBot).toString("base64")}" | base64 -d > ${stackDir}/html/index.js`);
          } else if (templateId.includes("fastify") || templateId.includes("express") || templateId.includes("next")) {
            const starterPkg = JSON.stringify({
              name: "node-app",
              version: "1.0.0",
              main: "index.js",
              scripts: { start: "node index.js" }
            }, null, 2);
            const starterNode = `const http = require('http');
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    app: process.env.APP_NAME || '${app.name}',
    runtime: 'Node.js 20 LTS',
    cluster: 'DK1'
  }));
});
server.listen(port, '0.0.0.0', () => {
  console.log('App Node.js ativo na porta ' + port);
});
`;
            await execSshCommand(conn, `echo "${Buffer.from(starterPkg).toString("base64")}" | base64 -d > ${stackDir}/html/package.json && echo "${Buffer.from(starterNode).toString("base64")}" | base64 -d > ${stackDir}/html/index.js`);
          } else {
            // Apenas grava página padrão se não for uma stack com container pré-empacotado (como WordPress, Ghost, Kuma, N8N, Typebot, etc)
            const isSelfContainedImage =
              templateId.includes("wordpress") ||
              templateId.includes("ghost") ||
              templateId.includes("kuma") ||
              templateId.includes("evolution") ||
              templateId.includes("whatsapp") ||
              templateId.includes("n8n") ||
              templateId.includes("typebot") ||
              templateId.includes("pocketbase") ||
              templateId.includes("openstatus") ||
              templateId.includes("postgres") ||
              templateId.includes("mysql") ||
              templateId.includes("redis");

            if (!isSelfContainedImage) {
              // Arquivo padrão de boas-vindas
              const welcomeHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${app.name} — Online</title><style>body{font-family:system-ui;background:#000606;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}.card{text-align:center;padding:2.5rem;background:#040e0e;border:1px solid #0e2424;border-radius:1.5rem;max-width:480px}.tag{display:inline-block;padding:4px 12px;background:rgba(34,197,94,0.15);color:#4ade80;border-radius:9999px;font-size:0.8rem;font-weight:700;margin-bottom:1rem}h1{margin:0 0 .5rem;color:#00f5ff}p{color:#94a3b8;font-size:0.9rem}</style></head><body><div class="card"><div class="tag">● Online • Eqsam PaaS</div><h1>${app.name}</h1><p>Aplicação ativa e conectada ao cluster com sucesso.</p></div></body></html>`;
              const b64 = Buffer.from(welcomeHtml).toString("base64");
              await execSshCommand(conn, `echo "${b64}" | base64 -d > ${stackDir}/html/index.html`);
            }
          }
        }
      } catch (fErr: any) {
        console.warn(`[deployTemplateStackToSwarm] Aviso ao sincronizar arquivos:`, fErr?.message);
      }

      const getEnv = (key: string, fallback?: string): string => {
        const found = (app.env_vars || []).find((e) => e.key === key)?.value;
        if (found !== undefined && found !== null && String(found).trim() !== "") {
          const s = String(found).trim();
          if (!isInsecureOrPlaceholderValue(key, s)) {
            return s;
          }
        }
        if (fallback !== undefined && fallback !== null && !isInsecureOrPlaceholderValue(key, fallback)) {
          return fallback;
        }
        return generateSecureRandomSecret(key);
      };

      let composeYaml = "";

      // 1. TEMPLATE: WORDPRESS + MYSQL
      if (templateId.includes("wordpress")) {
        const wpDbName = getEnv("WORDPRESS_DB_NAME", "wordpress");
        const wpDbUser = getEnv("WORDPRESS_DB_USER", "wordpress");
        const wpDbPass = getEnv("WORDPRESS_DB_PASSWORD");
        const wpRootPass = getEnv("MYSQL_ROOT_PASSWORD");

        composeYaml = `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_db:
    driver: local
  vol_${cleanId}_html:
    driver: local
services:
  db:
    image: mysql:8.4
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_db:/var/lib/mysql
    environment:
      MYSQL_DATABASE: "${wpDbName}"
      MYSQL_USER: "${wpDbUser}"
      MYSQL_PASSWORD: "${wpDbPass}"
      MYSQL_ROOT_PASSWORD: "${wpRootPass}"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${dbWpCpu}"
          memory: ${dbWpMem}
  app:
    image: wordpress:6.6-php8.3-apache
    networks:
      - net_${cleanId}
      - public-ingress
    volumes:
      - vol_${cleanId}_html:/var/www/html
    environment:
      WORDPRESS_DB_HOST: "db:3306"
      WORDPRESS_DB_USER: "${wpDbUser}"
      WORDPRESS_DB_PASSWORD: "${wpDbPass}"
      WORDPRESS_DB_NAME: "${wpDbName}"
      WORDPRESS_CONFIG_EXTRA: "if (isset(\\$_SERVER['HTTP_X_FORWARDED_PROTO']) && \\$_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') { \\$_SERVER['HTTPS'] = 'on'; }"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${appWpCpu}"
          memory: ${appWpMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=80"
`;
      } 
      // 2. TEMPLATE: N8N AUTOMATION + POSTGRES
      else if (templateId.includes("n8n")) {
        const n8nDbPass = getEnv("DB_POSTGRESDB_PASSWORD", getEnv("POSTGRES_PASSWORD"));
        const n8nEncKey = getEnv("N8N_ENCRYPTION_KEY");

        composeYaml = `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_pg:
    driver: local
  vol_${cleanId}_data:
    driver: local
services:
  db:
    image: postgres:16-alpine
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_pg:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: "n8n"
      POSTGRES_USER: "n8n"
      POSTGRES_PASSWORD: "${n8nDbPass}"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${dbWpCpu}"
          memory: ${dbWpMem}
  app:
    image: n8nio/n8n:1.55.0
    networks:
      - net_${cleanId}
      - public-ingress
    volumes:
      - vol_${cleanId}_data:/home/node/.n8n
    environment:
      DB_TYPE: "postgresdb"
      DB_POSTGRESDB_HOST: "db"
      DB_POSTGRESDB_PORT: "5432"
      DB_POSTGRESDB_DATABASE: "n8n"
      DB_POSTGRESDB_USER: "n8n"
      DB_POSTGRESDB_PASSWORD: "${n8nDbPass}"
      N8N_ENCRYPTION_KEY: "${n8nEncKey}"
      N8N_PORT: "5678"
      N8N_PROTOCOL: "https"
      WEBHOOK_URL: "https://${cleanHost}/"
      N8N_EDITOR_BASE_URL: "https://${cleanHost}/"
      GENERIC_TIMEZONE: "America/Sao_Paulo"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${appWpCpu}"
          memory: ${appWpMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=5678"
`;
      }
      // 3. TEMPLATE: UPTIME KUMA
      else if (templateId.includes("kuma")) {
        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_kuma:
    driver: local
services:
  app:
    image: louislam/uptime-kuma:1
    networks:
      - public-ingress
    volumes:
      - vol_${cleanId}_kuma:/app/data
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=3001"
`;
      }
      // 4. TEMPLATE: OPENSTATUS (NATIVO DOCKER • COM LIBSQL EMBUTIDO & DASHBOARD ADMIN)
      else if (templateId.includes("openstatus")) {
        const adminHost = `admin-openstatus-${cleanId}.${server.wildcardDomain || 'dk1.eqsam.com'}`;
        const resendApiKey = getEnv("RESEND_API_KEY", "re_insira_sua_chave_resend_aqui");
        const nextAuthSecret = getEnv("NEXTAUTH_SECRET");
        const authSecret = getEnv("AUTH_SECRET", nextAuthSecret);
        const cronSecret = getEnv("CRON_SECRET");
        const dbUrl = getEnv("DATABASE_URL", "http://db:8080");
        const tursoDbUrl = getEnv("TURSO_DATABASE_URL", dbUrl);
        const nextAuthUrl = getEnv("NEXTAUTH_URL", `https://${adminHost}`);
        const nextPublicUrl = getEnv("NEXT_PUBLIC_URL", `https://${adminHost}`);
        const nodeEnv = getEnv("NODE_ENV", "production");
        const port = getEnv("PORT", "3000");
        const hostname = getEnv("HOSTNAME", "0.0.0.0");
        const nodeOptions = getEnv("NODE_OPTIONS", "--max-old-space-size=512");
        const authTrustHost = getEnv("AUTH_TRUST_HOST", "true");
        const skipEnvValidation = getEnv("SKIP_ENV_VALIDATION", "true");
        const selfHost = getEnv("SELF_HOST", "true");
        const projIdVercel = getEnv("PROJECT_ID_VERCEL", "dummy");
        const teamIdVercel = getEnv("TEAM_ID_VERCEL", "dummy");
        const vercelAuthBearer = getEnv("VERCEL_AUTH_BEARER_TOKEN", "dummy");
        const stripeSecretKey = getEnv("STRIPE_SECRET_KEY", "dummy");
        const tinyBirdApiKey = getEnv("TINY_BIRD_API_KEY", "dummy");
        const unkeyApiId = getEnv("UNKEY_API_ID", "dummy");
        const unkeyToken = getEnv("UNKEY_TOKEN", "dummy");

        composeYaml = `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_sqld:
    driver: local
  vol_${cleanId}_data:
    driver: local
services:
  db:
    image: ghcr.io/tursodatabase/libsql-server:latest
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_sqld:/var/lib/sqld
    environment:
      SQLD_NODE: "primary"
      SQLD_HTTP_LISTEN_ADDR: "0.0.0.0:8080"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${osDbCpu}"
          memory: ${osDbMem}
  app:
    image: ghcr.io/openstatushq/openstatus-status-page:latest
    networks:
      - net_${cleanId}
      - public-ingress
    volumes:
      - vol_${cleanId}_data:/app/data
    environment:
      PORT: "${port}"
      HOSTNAME: "${hostname}"
      NODE_ENV: "${nodeEnv}"
      NODE_OPTIONS: "${nodeOptions}"
      AUTH_TRUST_HOST: "${authTrustHost}"
      SKIP_ENV_VALIDATION: "${skipEnvValidation}"
      DATABASE_URL: "${dbUrl}"
      TURSO_DATABASE_URL: "${tursoDbUrl}"
      AUTH_SECRET: "${authSecret}"
      CRON_SECRET: "${cronSecret}"
      PROJECT_ID_VERCEL: "${projIdVercel}"
      TEAM_ID_VERCEL: "${teamIdVercel}"
      VERCEL_AUTH_BEARER_TOKEN: "${vercelAuthBearer}"
      RESEND_API_KEY: "${resendApiKey}"
      STRIPE_SECRET_KEY: "${stripeSecretKey}"
      TINY_BIRD_API_KEY: "${tinyBirdApiKey}"
      UNKEY_API_ID: "${unkeyApiId}"
      UNKEY_TOKEN: "${unkeyToken}"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${osAppCpu}"
          memory: ${osAppMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=3000"
  dashboard:
    image: ghcr.io/openstatushq/openstatus-dashboard:latest
    networks:
      - net_${cleanId}
      - public-ingress
    environment:
      PORT: "${port}"
      HOSTNAME: "${hostname}"
      NODE_ENV: "${nodeEnv}"
      NODE_OPTIONS: "${nodeOptions}"
      SELF_HOST: "${selfHost}"
      AUTH_TRUST_HOST: "${authTrustHost}"
      SKIP_ENV_VALIDATION: "${skipEnvValidation}"
      DATABASE_URL: "${dbUrl}"
      TURSO_DATABASE_URL: "${tursoDbUrl}"
      AUTH_SECRET: "${authSecret}"
      NEXTAUTH_SECRET: "${nextAuthSecret}"
      NEXTAUTH_URL: "${nextAuthUrl}"
      NEXT_PUBLIC_URL: "${nextPublicUrl}"
      RESEND_API_KEY: "${resendApiKey}"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${osDashCpu}"
          memory: ${osDashMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_dash-http.rule=Host(\`${adminHost}\`)"
        - "traefik.http.routers.${stackName}_dash-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_dash-http.service=${stackName}_dash"
        - "traefik.http.routers.${stackName}_dash-https.rule=Host(\`${adminHost}\`)"
        - "traefik.http.routers.${stackName}_dash-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_dash-https.tls=true"
        - "traefik.http.routers.${stackName}_dash-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_dash-https.service=${stackName}_dash"
        - "traefik.http.services.${stackName}_dash.loadbalancer.server.port=3000"
`;
      }
      // 5. TEMPLATE: EVOLUTION API (WHATSAPP)
      else if (templateId.includes("evolution") || templateId.includes("whatsapp")) {
        const evoApiKey = getEnv("AUTHENTICATION_API_KEY");
        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_evo:
    driver: local
services:
  app:
    image: evoapicloud/evolution-api:v2.2.3
    networks:
      - public-ingress
    volumes:
      - vol_${cleanId}_evo:/evolution/instances
    environment:
      SERVER_PORT: "8080"
      SERVER_URL: "https://${cleanHost}"
      AUTHENTICATION_API_KEY: "${evoApiKey}"
      DATABASE_ENABLED: "false"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=8080"
`;
      }
      // 6. TEMPLATE: GHOST CMS
      else if (templateId.includes("ghost")) {
        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_ghost:
    driver: local
services:
  app:
    image: ghost:5-alpine
    networks:
      - public-ingress
    volumes:
      - vol_${cleanId}_ghost:/var/lib/ghost/content
    environment:
      url: "https://${cleanHost}"
      NODE_ENV: "production"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=2368"
`;
      }
      // 7. TEMPLATE: POCKETBASE
      else if (templateId.includes("pocketbase")) {
        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_pb:
    driver: local
services:
  app:
    image: ghcr.io/muchobien/pocketbase:latest
    networks:
      - public-ingress
    volumes:
      - vol_${cleanId}_pb:/pb_data
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=8090"
`;
      }
      // 8. TEMPLATE: TYPEBOT CLUSTER COMPLETO (BUILDER + VIEWER + POSTGRES)
      else if (templateId.includes("typebot")) {
        const tbDbPass = getEnv("POSTGRES_PASSWORD");
        const tbSecret = getEnv("ENCRYPTION_SECRET");
        composeYaml = `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_tb_db:
    driver: local
services:
  db:
    image: postgres:16-alpine
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_tb_db:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: "typebot"
      POSTGRES_USER: "typebot"
      POSTGRES_PASSWORD: "${tbDbPass}"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${tbDbCpu}"
          memory: ${tbDbMem}
  builder:
    image: baptistearno/typebot-builder:latest
    networks:
      - net_${cleanId}
      - public-ingress
    environment:
      DATABASE_URL: "postgresql://typebot:${tbDbPass}@db:5432/typebot"
      NEXTAUTH_URL: "https://${cleanHost}"
      NEXT_PUBLIC_VIEWER_URL: "https://viewer-${cleanId}.${wildcard}"
      ENCRYPTION_SECRET: "${tbSecret}"
      PORT: "3000"
      DISABLE_SIGNUP: "false"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${tbBuilderCpu}"
          memory: ${tbBuilderMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_builder-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_builder-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_builder-http.service=${stackName}_builder"
        - "traefik.http.routers.${stackName}_builder-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_builder-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_builder-https.tls=true"
        - "traefik.http.routers.${stackName}_builder-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_builder-https.service=${stackName}_builder"
        - "traefik.http.services.${stackName}_builder.loadbalancer.server.port=3000"
  viewer:
    image: baptistearno/typebot-viewer:latest
    networks:
      - net_${cleanId}
      - public-ingress
    environment:
      DATABASE_URL: "postgresql://typebot:${tbDbPass}@db:5432/typebot"
      NEXTAUTH_URL: "https://viewer-${cleanId}.${wildcard}"
      ENCRYPTION_SECRET: "${tbSecret}"
      PORT: "3000"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${tbViewerCpu}"
          memory: ${tbViewerMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_viewer-http.rule=Host(\`viewer-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_viewer-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_viewer-http.service=${stackName}_viewer"
        - "traefik.http.routers.${stackName}_viewer-https.rule=Host(\`viewer-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_viewer-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_viewer-https.tls=true"
        - "traefik.http.routers.${stackName}_viewer-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_viewer-https.service=${stackName}_viewer"
        - "traefik.http.services.${stackName}_viewer.loadbalancer.server.port=3000"
`;
      }
      // 9. TEMPLATE: PHP / LARAVEL (APACHE + PHP 8.3 COM MOD_REWRITE)
      else if (templateId.includes("php") || templateId.includes("laravel")) {
        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: php:8.3-apache
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/var/www/html
    environment:
      APP_NAME: "${app.name}"
      APP_ENV: "production"
    command: >
      sh -c "a2enmod rewrite 2>/dev/null || true;
      if [ -d /var/www/html/public ]; then
        sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/*.conf /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf 2>/dev/null || true;
      fi;
      apache2-foreground"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=80"
`;
      }
      // 10. TEMPLATE: POSTGRESQL DATABASE + ADMINER WEB UI
      else if (templateId.includes("postgres")) {
        const dbPort = calculateDatabasePort(cleanId, "postgres");
        const pgDb = getEnv("POSTGRES_DB", "main");
        const pgUser = getEnv("POSTGRES_USER", "postgres");
        const pgPass = getEnv("POSTGRES_PASSWORD");

        composeYaml = `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_pg:
    driver: local
services:
  db:
    image: postgres:16-alpine
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_pg:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: "${pgDb}"
      POSTGRES_USER: "${pgUser}"
      POSTGRES_PASSWORD: "${pgPass}"
    ports:
      - target: 5432
        published: ${dbPort}
        mode: ingress
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${dbCpu}"
          memory: ${dbMem}
  adminer:
    image: adminer:latest
    networks:
      - net_${cleanId}
      - public-ingress
    environment:
      ADMINER_DEFAULT_SERVER: "db"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${adminerCpu}"
          memory: ${adminerMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_adminer-http.rule=Host(\`${cleanHost}\`) || Host(\`admin-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_adminer-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_adminer-http.service=${stackName}_adminer"
        - "traefik.http.routers.${stackName}_adminer-https.rule=Host(\`${cleanHost}\`) || Host(\`admin-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_adminer-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_adminer-https.tls=true"
        - "traefik.http.routers.${stackName}_adminer-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_adminer-https.service=${stackName}_adminer"
        - "traefik.http.services.${stackName}_adminer.loadbalancer.server.port=8080"
`;
      }
      // 11. TEMPLATE: MYSQL DATABASE + ADMINER WEB UI
      else if (templateId.includes("mysql")) {
        const dbPort = calculateDatabasePort(cleanId, "mysql");
        const mysqlDb = getEnv("MYSQL_DATABASE", "main");
        const mysqlUser = getEnv("MYSQL_USER", "dbuser");
        const mysqlPass = getEnv("MYSQL_PASSWORD");
        const mysqlRootPass = getEnv("MYSQL_ROOT_PASSWORD");

        composeYaml = `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_mysql:
    driver: local
services:
  db:
    image: mysql:8.4
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_mysql:/var/lib/mysql
    environment:
      MYSQL_DATABASE: "${mysqlDb}"
      MYSQL_USER: "${mysqlUser}"
      MYSQL_PASSWORD: "${mysqlPass}"
      MYSQL_ROOT_PASSWORD: "${mysqlRootPass}"
    ports:
      - target: 3306
        published: ${dbPort}
        mode: ingress
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${dbCpu}"
          memory: ${dbMem}
  adminer:
    image: adminer:latest
    networks:
      - net_${cleanId}
      - public-ingress
    environment:
      ADMINER_DEFAULT_SERVER: "db"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${adminerCpu}"
          memory: ${adminerMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_adminer-http.rule=Host(\`${cleanHost}\`) || Host(\`admin-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_adminer-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_adminer-http.service=${stackName}_adminer"
        - "traefik.http.routers.${stackName}_adminer-https.rule=Host(\`${cleanHost}\`) || Host(\`admin-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_adminer-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_adminer-https.tls=true"
        - "traefik.http.routers.${stackName}_adminer-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_adminer-https.service=${stackName}_adminer"
        - "traefik.http.services.${stackName}_adminer.loadbalancer.server.port=8080"
`;
      }
      // 12. TEMPLATE: REDIS CACHE & BROKER + REDIS COMMANDER WEB UI
      else if (templateId.includes("redis")) {
        const dbPort = calculateDatabasePort(cleanId, "redis");
        const redisPass = getEnv("REDIS_PASSWORD");

        composeYaml = `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_redis:
    driver: local
services:
  db:
    image: redis:7.2-alpine
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${redisPass}"]
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_redis:/data
    ports:
      - target: 6379
        published: ${dbPort}
        mode: ingress
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${dbCpu}"
          memory: ${dbMem}
  rediscommander:
    image: rediscommander/redis-commander:latest
    networks:
      - net_${cleanId}
      - public-ingress
    environment:
      REDIS_HOSTS: "local:db:6379:0:${redisPass}"
      PORT: "8081"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${adminerCpu}"
          memory: ${adminerMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_rediscommander-http.rule=Host(\`${cleanHost}\`) || Host(\`admin-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_rediscommander-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_rediscommander-http.service=${stackName}_rediscommander"
        - "traefik.http.routers.${stackName}_rediscommander-https.rule=Host(\`${cleanHost}\`) || Host(\`admin-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_rediscommander-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_rediscommander-https.tls=true"
        - "traefik.http.routers.${stackName}_rediscommander-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_rediscommander-https.service=${stackName}_rediscommander"
        - "traefik.http.services.${stackName}_rediscommander.loadbalancer.server.port=8081"
`;
      }
      // 13. TEMPLATE: DISCORD BOT (NODE.JS 20 WORKER + HEALTHCHECK HTTP)
      else if (templateId.includes("discord")) {
        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: node:20-alpine
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "3000"
      APP_NAME: "${app.name}"
      NODE_ENV: "production"
    command: sh -c "if [ -f package.json ]; then npm install --production && npm start; elif [ -f index.js ]; then node index.js; else sleep 3600; fi"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=3000"
`;
      }
      // 14. TEMPLATE: FASTIFY / EXPRESS REST API (NODE.JS 20)
      else if (templateId.includes("fastify") || templateId.includes("express")) {
        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: node:20-alpine
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "3000"
      HOST: "0.0.0.0"
      APP_NAME: "${app.name}"
      NODE_ENV: "production"
    command: sh -c "if [ -f package.json ]; then npm install --production && npm start; elif [ -f index.js ]; then node index.js; else sleep 3600; fi"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=3000"
`;
      }
      // 15. TEMPLATE: PYTHON FASTAPI / DJANGO / FLASK
      else if (templateId.includes("python") || templateId.includes("fastapi") || templateId.includes("flask") || templateId.includes("django")) {
        const isFastApi = templateId.includes("fastapi");
        const appPort = isFastApi ? 8000 : 5000;
        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: python:3.11-slim
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "${appPort}"
      APP_NAME: "${app.name}"
      PYTHONUNBUFFERED: "1"
    command: sh -c "if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi; if [ -f main.py ]; then python3 main.py; elif [ -f app.py ]; then python3 app.py; else python3 -m http.server ${appPort}; fi"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=${appPort}"
`;
      }
      // 16. TEMPLATE: GO / GOLANG (FIBER & GIN)
      else if (templateId.includes("go") || templateId.includes("fiber") || templateId.includes("gin")) {
        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: golang:1.22-alpine
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "3000"
      APP_NAME: "${app.name}"
    command: sh -c "if [ ! -f go.mod ]; then go mod init app; fi; go run main.go"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=3000"
`;
      }
      // 17. TEMPLATE: JAVA 21 / SPRING BOOT
      else if (templateId.includes("java") || templateId.includes("spring")) {
        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: eclipse-temurin:21-jdk-alpine
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "8080"
      APP_NAME: "${app.name}"
    command: sh -c "if [ -f pom.xml ]; then ./mvnw -DskipTests spring-boot:run || mvn spring-boot:run; elif [ -f *.jar ]; then java -jar *.jar; elif [ -f Main.java ]; then javac Main.java && java Main; else java -version && sleep 3600; fi"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=8080"
`;
      }
      // 18. TEMPLATE: RUST (ACTIX & AXUM)
      else if (templateId.includes("rust") || templateId.includes("actix")) {
        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: rust:1.80-alpine
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "8080"
      APP_NAME: "${app.name}"
    command: sh -c "if [ -f Cargo.toml ]; then cargo run --release; elif [ -f src/main.rs ]; then rustc src/main.rs && ./main; else sleep 3600; fi"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=8080"
`;
      }
      // 19. TEMPLATE: NEXT.JS / REACT APP (SSR & NODE RUNTIME)
      else if (templateId.includes("nextjs") || templateId.includes("next")) {
        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: node:20-alpine
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "3000"
      HOST: "0.0.0.0"
      APP_NAME: "${app.name}"
      NODE_ENV: "production"
    command: sh -c "if [ -f package.json ]; then npm install && npm run build && npm start; elif [ -f index.js ]; then node index.js; else sleep 3600; fi"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=3000"
`;
      }
      // 20. TEMPLATE PADRÃO / SITE ESTÁTICO / CADDY SERVER HTTP/3 (Websites, Landing Pages)
      else {
        const runtimeToUse: DeploymentRuntime =
          template.runtime ||
          resolveDeploymentRuntime(templateId, template.build_pack || app.build_pack);

        // Gera e grava o Caddyfile otimizado no host remoto (hasAppService: false pois nesta stack roda apenas caddy:alpine)
        const caddyfileConfig = generateCaddyfileForRuntime(runtimeToUse, {
          rootDir: "/usr/share/caddy",
          port: template.default_port || 80,
          hasAppService: false,
        });
        const b64Caddyfile = Buffer.from(caddyfileConfig).toString("base64");
        await execSshCommand(conn, `echo "${b64Caddyfile}" | base64 -d > ${stackDir}/Caddyfile`);

        composeYaml = `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  web:
    image: caddy:alpine
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/usr/share/caddy
      - ${stackDir}/Caddyfile:/etc/caddy/Caddyfile:ro
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${cpuLimit}"
          memory: ${memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_web-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_web-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_web-http.service=${stackName}_web"
        - "traefik.http.routers.${stackName}_web-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_web-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_web-https.tls=true"
        - "traefik.http.routers.${stackName}_web-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_web-https.service=${stackName}_web"
        - "traefik.http.services.${stackName}_web.loadbalancer.server.port=80"
`;
      }

      // Salvar o docker-compose.yml no host remoto
      const b64Compose = Buffer.from(composeYaml).toString("base64");
      await execSshCommand(conn, `echo "${b64Compose}" | base64 -d > ${stackDir}/docker-compose.yml`);

      // Limpeza garantida de serviços obsoletos de templates anteriores que não existem mais neste compose
      try {
        const { out: activeSvcs } = await execSshCommand(
          conn,
          `docker service ls --filter name=${stackName}_ --format '{{.Name}}'`
        );
        const currentServices = activeSvcs.trim().split("\n").map((s) => s.trim()).filter(Boolean);
        for (const s of currentServices) {
          const baseName = s.replace(`${stackName}_`, "");
          if (!composeYaml.includes(`${baseName}:`)) {
            console.log(`[deployTemplateStackToSwarm] Removendo serviço obsoleto conflitante: ${s}`);
            await execSshCommand(conn, `docker service rm ${s} 2>/dev/null || true`);
          }
        }
      } catch (svcCleanErr: any) {
        console.warn(`[deployTemplateStackToSwarm Warning ao limpar serviços obsoletos]:`, svcCleanErr?.message);
      }

      // Executar docker stack deploy com --prune
      console.log(`[deployTemplateStackToSwarm] Disparando docker stack deploy --prune para ${stackName}...`);
      const deployRes = await execSshCommand(conn, `docker stack deploy --prune -c ${stackDir}/docker-compose.yml ${stackName}`);
      console.log(`[deployTemplateStackToSwarm] Saída do deploy:`, deployRes.out);

      // Se for OpenStatus, inicializa o schema completo do LibSQL para que o Next.js responda 200
      if (templateId.includes("openstatus")) {
        console.log(`[deployTemplateStackToSwarm] Inicializando schema completo LibSQL para OpenStatus...`);
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
            `openstatus-${cleanId}.${server.wildcardDomain || 'dk1.eqsam.com'}`,
            `app-${cleanId}.${server.wildcardDomain || 'dk1.eqsam.com'}`,
            'api',
            'status',
            'default'
          ];
          slugList.forEach((s, idx) => {
            sqlStatements.push(`INSERT OR REPLACE INTO page (id, workspace_id, title, description, slug, custom_domain, published, force_theme, custom_theme, default_locale, locales, configuration, auth_email_domains, allowed_ip_ranges, created_at, updated_at) VALUES (${idx + 1}, 1, '${(app.name || 'OpenStatus HQ').replace(/'/g, "''")}', 'Todos os sistemas operacionais 24/7', '${s}', '${s}', 1, 'system', '{}', 'en', '["en"]', '{}', '[]', '[]', ${nowSeconds}, ${nowSeconds});`);
          });

          const jsonPayload = JSON.stringify({
            requests: [
              ...sqlStatements.map((sql) => ({ type: "execute", stmt: { sql } })),
              { type: "close" }
            ]
          });
          const b64 = Buffer.from(jsonPayload).toString("base64");

          await execSshCommand(
            conn,
            `sleep 2 && echo "${b64}" | base64 -d > /tmp/os_seed_${cleanId}.json && docker run --rm -v /tmp/os_seed_${cleanId}.json:/tmp/seed.json --network ${stackName}_net_${cleanId} curlimages/curl:latest -s -X POST http://db:8080/v2/pipeline -H 'Content-Type: application/json' -d @/tmp/seed.json && rm -f /tmp/os_seed_${cleanId}.json || true`
          );
        } catch (initErr: any) {
          console.warn(`[deployTemplateStackToSwarm] Erro não bloqueante ao inicializar schema LibSQL:`, initErr?.message);
        }
      }

      conn.end();
      return { success: true, stackName, fqdn: defaultFqdn };
    } catch (innerErr: any) {
      conn.end();
      throw innerErr;
    }
  } catch (err: any) {
    console.warn(`[deployTemplateStackToSwarm Error]:`, err.message);
    return { success: false, stackName: "", fqdn: "", message: err.message };
  }
}
