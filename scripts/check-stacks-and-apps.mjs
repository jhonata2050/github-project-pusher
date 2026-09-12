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

const { getActiveClusterServer, getApplicationsStore } = await import("../src/lib/cloud-apps.server.ts");
const { SshConnectionManager } = await import("../src/lib/ssh-connection-manager.server.ts");

async function checkStacksAndApps() {
  const server = await getActiveClusterServer();
  const store = await getApplicationsStore();

  console.log("=== 1. STACKS INSTALADAS NO DOCKER SWARM (docker stack ls) ===");
  const stacks = await SshConnectionManager.execCommand(server, "docker stack ls");
  console.log(stacks.out.trim());

  console.log("\n=== 2. APLICAÇÕES NO STORAGE EQSAM ===");
  for (const app of store.applications) {
    console.log(`ID: ${app.id.slice(0, 12)} | Nome: ${app.name} | Status: ${app.status} | FQDN: ${app.fqdn} | StackName: ${app.composeStack?.stackName || 'sem stack'}`);
  }

  console.log("\n=== 3. TODOS OS CONTÊINERES ATIVOS (docker ps) ===");
  const ps = await SshConnectionManager.execCommand(server, "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'");
  console.log(ps.out.trim());

  await SshConnectionManager.closeAll();
}

checkStacksAndApps().catch(console.error);
