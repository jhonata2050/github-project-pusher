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

async function runCleanupAndRecovery() {
  const server = await getActiveClusterServer();
  console.log(`Conectando ao cluster Docker Swarm (${server.serverIp || server.host})...`);

  console.log("\n=== 1. ESPAÇO ATUAL ANTES DA LIMPEZA ===");
  const dfBefore = await SshConnectionManager.execCommand(server, "df -h /", { timeoutMs: 15000 });
  console.log(dfBefore.out.trim());

  console.log("\n=== 2. REMOVENDO CONTÊINERES PARADOS / MORTOS ===");
  const pruneContainers = await SshConnectionManager.execCommand(server, "docker container prune -f", { timeoutMs: 30000 });
  console.log(pruneContainers.out.trim());

  console.log("\n=== 3. LIMPANDO IMAGENS DOCKER NÃO UTILIZADAS ===");
  const pruneImages = await SshConnectionManager.execCommand(server, "docker image prune -a -f --filter 'until=48h'", { timeoutMs: 60000 });
  console.log(pruneImages.out.trim());

  console.log("\n=== 4. ESPAÇO APÓS A LIMPEZA ===");
  const dfAfter = await SshConnectionManager.execCommand(server, "df -h /", { timeoutMs: 15000 });
  console.log(dfAfter.out.trim());

  const dockerDfAfter = await SshConnectionManager.execCommand(server, "docker system df", { timeoutMs: 15000 });
  console.log(dockerDfAfter.out.trim());

  console.log("\n=== 5. RECUPERANDO SERVIÇOS QUE ESTAVAM COM ERRO DE DISCO CHEIO ===");
  const servicesToRecover = [
    "app_1faab31027e9_app",
    "app_1faab31027e9_dashboard",
    "app_9d845a79e685_dashboard"
  ];

  for (const svc of servicesToRecover) {
    console.log(`Recuperando ${svc}...`);
    const updateRes = await SshConnectionManager.execCommand(server, `docker service update --force ${svc}`, { timeoutMs: 30000 });
    console.log(`Update ${svc}: code=${updateRes.code}`);
  }

  console.log("\nAguardando 15 segundos para estabilização do Swarm...");
  await new Promise((r) => setTimeout(r, 15000));

  console.log("\n=== 6. ESTADO ATUAL DOS SERVIÇOS SWARM ===");
  const svcList = await SshConnectionManager.execCommand(server, "docker service ls", { timeoutMs: 15000 });
  console.log(svcList.out.trim());

  console.log("\n=== 7. VERIFICAÇÃO DAS TAREFAS DOS SERVIÇOS RECUPERADOS ===");
  for (const svc of servicesToRecover) {
    const ps = await SshConnectionManager.execCommand(server, `docker service ps ${svc} --no-trunc | head -n 3`, { timeoutMs: 15000 });
    console.log(`\n${svc}:`);
    console.log(ps.out.trim());
  }

  await SshConnectionManager.closeAll();
  console.log("\n=== OPERAÇÃO CONCLUÍDA ===");
}

runCleanupAndRecovery().catch(console.error);
