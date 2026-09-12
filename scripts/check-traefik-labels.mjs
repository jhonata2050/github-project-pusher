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

async function checkTraefikRouters() {
  const server = await getActiveClusterServer();

  console.log("=== TRAEFIK LABELS DOS SERVIÇOS SWARM ===");
  const cmd = `docker service ls --format '{{.Name}}'`;
  const svcs = (await SshConnectionManager.execCommand(server, cmd)).out.trim().split("\n");

  for (const s of svcs) {
    const trimmed = s.trim();
    if (!trimmed || trimmed === "traefik-ingress_traefik") continue;
    const inspect = await SshConnectionManager.execCommand(server, `docker service inspect ${trimmed} --format '{{json .Spec.Labels}}'`);
    try {
      const labels = JSON.parse(inspect.out.trim());
      const rule = Object.entries(labels).find(([k]) => k.includes("rule"))?.[1] || "Sem regra Traefik";
      console.log(`- ${trimmed}: ${rule}`);
    } catch {
      console.log(`- ${trimmed}: erro ao parsear labels`);
    }
  }

  await SshConnectionManager.closeAll();
}

checkTraefikRouters().catch(console.error);
