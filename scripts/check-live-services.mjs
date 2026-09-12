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

async function checkLiveServices() {
  const server = await getActiveClusterServer();

  console.log("=== DOCKER SERVICE LS ===");
  const svc = await SshConnectionManager.execCommand(server, "docker service ls");
  console.log(svc.out.trim());

  console.log("\n=== TAREFAS DE app_9d845a79e685_dashboard ===");
  const psDash = await SshConnectionManager.execCommand(server, "docker service ps app_9d845a79e685_dashboard --no-trunc | head -n 4");
  console.log(psDash.out.trim());

  console.log("\n=== TAREFAS DE app_9d845a79e685_app ===");
  const psApp = await SshConnectionManager.execCommand(server, "docker service ps app_9d845a79e685_app --no-trunc | head -n 4");
  console.log(psApp.out.trim());

  console.log("\n=== DISCO (df -h /) ===");
  const df = await SshConnectionManager.execCommand(server, "df -h /");
  console.log(df.out.trim());

  await SshConnectionManager.closeAll();
}

checkLiveServices().catch(console.error);
