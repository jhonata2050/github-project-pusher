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

async function checkAfterRmi() {
  const server = await getActiveClusterServer();

  console.log("=== 1. ESPAÇO DISPONÍVEL (df -h /) ===");
  const df = await SshConnectionManager.execCommand(server, "df -h /", { timeoutMs: 15000 });
  console.log(df.out.trim());

  console.log("\n=== 2. SE AINDA EXISTIR IMAGEM DUPLICADA, REMOVER COM TIMEOUT 60s ===");
  const rmi = await SshConnectionManager.execCommand(server, "docker rmi -f ac2a6c1f3bc8 9602d358d60c 2>&1 || true", { timeoutMs: 60000 });
  console.log(rmi.out.trim());

  console.log("\n=== 3. ESPAÇO APÓS RMI COMPLETO (df -h /) ===");
  const dfAfter = await SshConnectionManager.execCommand(server, "df -h /", { timeoutMs: 15000 });
  console.log(dfAfter.out.trim());

  console.log("\n=== 4. REINICIAR SERVIÇOS DO STACK 9d845a79e685 COM --DETACH ===");
  await SshConnectionManager.execCommand(server, "docker service update --detach --force app_9d845a79e685_dashboard", { timeoutMs: 15000 });
  await SshConnectionManager.execCommand(server, "docker service update --detach --force app_48f9566be7a07925_db", { timeoutMs: 15000 });

  await SshConnectionManager.closeAll();
}

checkAfterRmi().catch(console.error);
