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

async function fastDiskInspection() {
  const server = await getActiveClusterServer();

  console.log("=== 1. DISCO ATUAL (df -h /) ===");
  const df = await SshConnectionManager.execCommand(server, "df -h /", { timeoutMs: 10000 });
  console.log(df.out.trim());

  console.log("\n=== 2. TODAS AS IMAGENS NO SERVIDOR COM TAMANHOS ===");
  const images = await SshConnectionManager.execCommand(server, "docker image ls --format 'table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.ID}}'", { timeoutMs: 15000 });
  console.log(images.out.trim());

  console.log("\n=== 3. APT CACHE & LOGS DO SISTEMA ===");
  const apt = await SshConnectionManager.execCommand(server, "du -sh /var/cache/apt /var/log 2>/dev/null", { timeoutMs: 10000 });
  console.log(apt.out.trim());

  await SshConnectionManager.closeAll();
}

fastDiskInspection().catch(console.error);
