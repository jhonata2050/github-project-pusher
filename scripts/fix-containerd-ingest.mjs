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

async function fixContainerdIngest() {
  const server = await getActiveClusterServer();

  console.log("=== 1. VERIFICANDO /var/lib/containerd/io.containerd.content.v1.content/ingest ===");
  const lsIngest = await SshConnectionManager.execCommand(server, "ls -la /var/lib/containerd/io.containerd.content.v1.content/ingest/ | head -n 10", { timeoutMs: 10000 });
  console.log(lsIngest.out.trim());

  console.log("\n=== 2. LIMPANDO DIRETÓRIO DE INGEST CORROMPIDO DO CONTAINERD ===");
  const rmIngest = await SshConnectionManager.execCommand(server, "rm -rf /var/lib/containerd/io.containerd.content.v1.content/ingest/*", { timeoutMs: 15000 });
  console.log("RM Ingest code:", rmIngest.code);

  console.log("\n=== 3. REINICIANDO CONTAINERD / DOCKER SE NECESSÁRIO ===");
  // Reiniciar containerd limpa caches em memória de refs de layers corrompidas
  const systemctl = await SshConnectionManager.execCommand(server, "systemctl restart containerd && systemctl restart docker", { timeoutMs: 30000 });
  console.log("Restart containerd/docker:", systemctl.code, systemctl.out.trim(), systemctl.err.trim());

  console.log("\nAguardando 8 segundos para reinicialização dos daemons...");
  await new Promise(r => setTimeout(r, 8000));

  console.log("\n=== 4. FORÇANDO REDEPLOY DAS TAREFAS ===");
  for (const s of ["app_1faab31027e9_app", "app_1faab31027e9_dashboard", "app_9d845a79e685_dashboard"]) {
    const upd = await SshConnectionManager.execCommand(server, `docker service update --detach --force ${s}`, { timeoutMs: 15000 });
    console.log(`Update ${s}:`, upd.out.trim());
  }

  await SshConnectionManager.closeAll();
}

fixContainerdIngest().catch(console.error);
