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

async function stabilizeClusterStorage() {
  const server = await getActiveClusterServer();

  console.log("=== 1. ESCALANDO STACK QUEBRADA app_1faab31027e9 PARA 0 RÉPLICAS ===");
  // Isso impede que o Swarm fique tentando baixar e extrair imagens de 2.78GB em loop infinito
  const scale = await SshConnectionManager.execCommand(server, "docker service scale app_1faab31027e9_app=0 app_1faab31027e9_dashboard=0 app_1faab31027e9_db=0", { timeoutMs: 15000 });
  console.log("Scale:", scale.out.trim());

  console.log("\n=== 2. LIMPANDO CONTÊINERES PARADOS E CAMADAS TEMPORÁRIAS ===");
  await SshConnectionManager.execCommand(server, "docker container prune -f", { timeoutMs: 20000 });
  await SshConnectionManager.execCommand(server, "rm -rf /var/lib/containerd/io.containerd.content.v1.content/ingest/*", { timeoutMs: 15000 });
  await SshConnectionManager.execCommand(server, "docker image prune -f", { timeoutMs: 20000 });

  console.log("\n=== 3. ESPAÇO ATUAL (df -h /) ===");
  const df = await SshConnectionManager.execCommand(server, "df -h /", { timeoutMs: 10000 });
  console.log(df.out.trim());

  console.log("\n=== 4. FORÇANDO SUBIDA DO POSTGRESQL (n8n db) ===");
  await SshConnectionManager.execCommand(server, "docker service update --detach --force app_48f9566be7a07925_db", { timeoutMs: 15000 });

  console.log("\nAguardando 8 segundos para conferir réplicas...");
  await new Promise(r => setTimeout(r, 8000));

  console.log("\n=== 5. STATUS FINAL DOS SERVIÇOS ===");
  const svcList = await SshConnectionManager.execCommand(server, "docker service ls", { timeoutMs: 15000 });
  console.log(svcList.out.trim());

  await SshConnectionManager.closeAll();
}

stabilizeClusterStorage().catch(console.error);
