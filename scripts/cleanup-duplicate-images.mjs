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

async function cleanupDuplicateImages() {
  const server = await getActiveClusterServer();

  console.log("=== 1. IMAGENS EM USO PELOS CONTÊINERES ATUAIS ===");
  const activeImages = await SshConnectionManager.execCommand(server, "docker ps -a --format '{{.Image}}' | sort -u");
  console.log("Imagens ativas:\n" + activeImages.out.trim());

  console.log("\n=== 2. REMOVENDO AS DUAS VERSÕES ANTIGAS DE 2.78GB DO OPENSTATUS ===");
  // Vamos tentar remover ac2a6c1f3bc8 e 9602d358d60c
  const rmi1 = await SshConnectionManager.execCommand(server, "docker rmi -f ac2a6c1f3bc8 9602d358d60c 2>&1 || true");
  console.log("Resultado docker rmi:", rmi1.out.trim());

  console.log("\n=== 3. ESPAÇO APÓS REMOÇÃO (df -h /) ===");
  const df = await SshConnectionManager.execCommand(server, "df -h /");
  console.log(df.out.trim());

  console.log("\n=== 4. LIMPAR CONTAINERD INGEST ===");
  await SshConnectionManager.execCommand(server, "rm -rf /var/lib/containerd/io.containerd.content.v1.content/ingest/*");

  console.log("\n=== 5. REINICIAR SERVIÇOS PENDENTES (dashboard & postgres) ===");
  await SshConnectionManager.execCommand(server, "docker service update --detach --force app_9d845a79e685_dashboard");
  await SshConnectionManager.execCommand(server, "docker service update --detach --force app_48f9566be7a07925_db");
  await SshConnectionManager.execCommand(server, "docker service update --detach --force app_1faab31027e9_app");
  await SshConnectionManager.execCommand(server, "docker service update --detach --force app_1faab31027e9_dashboard");

  await SshConnectionManager.closeAll();
}

cleanupDuplicateImages().catch(console.error);
