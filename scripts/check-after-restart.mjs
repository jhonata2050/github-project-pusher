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

async function checkAfterRestart() {
  const server = await getActiveClusterServer();

  console.log("=== 1. FORÇANDO UPDATE DOS SERVIÇOS APÓS RESTART LIMPO ===");
  for (const s of ["app_1faab31027e9_app", "app_1faab31027e9_dashboard", "app_9d845a79e685_dashboard"]) {
    const upd = await SshConnectionManager.execCommand(server, `docker service update --detach --force ${s}`, { timeoutMs: 15000 });
    console.log(`Update ${s}:`, upd.out.trim());
  }

  console.log("\nAguardando 15 segundos para inicialização dos contêineres...");
  await new Promise(r => setTimeout(r, 15000));

  console.log("\n=== 2. LISTA DE SERVIÇOS SWARM ===");
  const svcList = await SshConnectionManager.execCommand(server, "docker service ls", { timeoutMs: 15000 });
  console.log(svcList.out.trim());

  console.log("\n=== 3. TAREFAS RECENTES DOS SERVIÇOS ===");
  for (const s of ["app_1faab31027e9_app", "app_1faab31027e9_dashboard", "app_9d845a79e685_dashboard"]) {
    console.log(`\n--- docker service ps ${s} ---`);
    const ps = await SshConnectionManager.execCommand(server, `docker service ps ${s} --no-trunc | head -n 4`, { timeoutMs: 10000 });
    console.log(ps.out.trim());
  }

  await SshConnectionManager.closeAll();
}

checkAfterRestart().catch(console.error);
