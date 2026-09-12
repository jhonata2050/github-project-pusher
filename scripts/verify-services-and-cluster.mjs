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

async function verifyCluster() {
  const server = await getActiveClusterServer();

  console.log("=== 1. STATUS DE TODOS OS SERVIÇOS DOCKER SWARM ===");
  const svcList = await SshConnectionManager.execCommand(server, "docker service ls", { timeoutMs: 15000 });
  console.log(svcList.out.trim());

  console.log("\n=== 2. CONTÊINERES ATIVOS / RECENTES ===");
  const ps = await SshConnectionManager.execCommand(server, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'", { timeoutMs: 15000 });
  console.log(ps.out.trim());

  console.log("\n=== 3. ESPAÇO DISPONÍVEL NO DISCO ===");
  const df = await SshConnectionManager.execCommand(server, "df -h /", { timeoutMs: 10000 });
  console.log(df.out.trim());

  await SshConnectionManager.closeAll();
}

verifyCluster().catch(console.error);
