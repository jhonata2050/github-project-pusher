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

async function checkNetworksAndOpenFiles() {
  const server = await getActiveClusterServer();

  console.log("=== 1. DISCO ATUAL (df -h) ===");
  const df = await SshConnectionManager.execCommand(server, "df -h");
  console.log(df.out.trim());

  console.log("\n=== 2. INODES (df -i) ===");
  const dfi = await SshConnectionManager.execCommand(server, "df -i");
  console.log(dfi.out.trim());

  console.log("\n=== 3. REDES DOCKER (docker network ls) ===");
  const nets = await SshConnectionManager.execCommand(server, "docker network ls");
  console.log(nets.out.trim());

  console.log("\n=== 4. DETALHES DA REDE ovbwfmh1hzy8zghgsm0tac1ur ===");
  const netDetail = await SshConnectionManager.execCommand(server, "docker network inspect ovbwfmh1hzy8zghgsm0tac1ur --format '{{.Name}} | {{.Driver}} | {{.Scope}}'");
  console.log(netDetail.out.trim());

  console.log("\n=== 5. ESTADO ATUAL DAS RÉPLICAS (docker service ls) ===");
  const svcList = await SshConnectionManager.execCommand(server, "docker service ls");
  console.log(svcList.out.trim());

  console.log("\n=== 6. LOGS DO APP_9D845A79E685_APP ===");
  const appLogs = await SshConnectionManager.execCommand(server, "docker service logs --tail 30 app_9d845a79e685_app 2>&1");
  console.log(appLogs.out.trim());

  console.log("\n=== 7. LOGS DO APP_9D845A79E685_DASHBOARD ===");
  const dashLogs = await SshConnectionManager.execCommand(server, "docker service logs --tail 30 app_9d845a79e685_dashboard 2>&1");
  console.log(dashLogs.out.trim());

  await SshConnectionManager.closeAll();
}

checkNetworksAndOpenFiles().catch(console.error);
