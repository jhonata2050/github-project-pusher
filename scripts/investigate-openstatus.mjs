process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SECRET_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY;
}

const { getActiveClusterServer } = await import("../src/lib/cloud-apps.server.ts");
const { SshConnectionManager } = await import("../src/lib/ssh-connection-manager.server.ts");

async function investigateOpenStatus() {
  const server = await getActiveClusterServer();

  console.log("=== 1. TAREFAS DOS SERVIÇOS DO STACK app_9d845a79e685 ===");
  const svcs = ["app_9d845a79e685_app", "app_9d845a79e685_dashboard", "app_9d845a79e685_db"];
  for (const s of svcs) {
    console.log(`\n--- ${s} (docker service ps) ---`);
    const ps = await SshConnectionManager.execCommand(server, `docker service ps ${s} --no-trunc | head -n 5`);
    console.log(ps.out.trim());
  }

  console.log("\n=== 2. LOGS DOS SERVIÇOS ===");
  for (const s of svcs) {
    console.log(`\n--- ${s} (logs) ---`);
    const logs = await SshConnectionManager.execCommand(server, `docker service logs --tail 25 ${s} 2>&1`);
    console.log(logs.out.trim());
  }

  console.log("\n=== 3. REDES DO TRAEFIK E DOS SERVIÇOS ===");
  const traefikNet = await SshConnectionManager.execCommand(server, "docker service inspect traefik-ingress_traefik --format '{{json .Spec.TaskTemplate.Networks}}'");
  console.log("Traefik Networks:", traefikNet.out.trim());

  for (const s of ["app_9d845a79e685_app", "app_9d845a79e685_dashboard"]) {
    const net = await SshConnectionManager.execCommand(server, `docker service inspect ${s} --format '{{json .Spec.TaskTemplate.Networks}}'`);
    console.log(`${s} Networks:`, net.out.trim());
  }

  console.log("\n=== 4. LABELS COMPLETAS DO TRAEFIK DOS SERVIÇOS ===");
  for (const s of ["app_9d845a79e685_app", "app_9d845a79e685_dashboard"]) {
    const labels = await SshConnectionManager.execCommand(server, `docker service inspect ${s} --format '{{json .Spec.Labels}}'`);
    console.log(`${s} Labels:`, labels.out.trim());
  }

  console.log("\n=== 5. TESTE DE CURL LOCAL DENTRO DO HOST (IP DO CONTAINER / LOCALHOST) ===");
  // Testar direto no container ou na porta interna
  const directCurl = await SshConnectionManager.execCommand(server, "curl -Iv -m 5 http://127.0.0.1:3000 2>&1 || true");
  console.log("Curl localhost:3000:", directCurl.out.trim());

  await SshConnectionManager.closeAll();
}

investigateOpenStatus().catch(console.error);
