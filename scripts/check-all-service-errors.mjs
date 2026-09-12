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

const { getActiveClusterServer, getApplicationsStore } = await import("../src/lib/cloud-apps.server.ts");
const { SshConnectionManager } = await import("../src/lib/ssh-connection-manager.server.ts");

async function checkAllServiceErrors() {
  const server = await getActiveClusterServer();

  console.log("=== VERIFICANDO LOGS E ERROS DE TODOS OS SERVIÇOS DO CLUSTER ===");
  
  const svcListRes = await SshConnectionManager.execCommand(server, "docker service ls --format '{{.Name}}'");
  const serviceNames = svcListRes.out.trim().split("\n").filter(Boolean);

  console.log(`Total de serviços Swarm encontrados: ${serviceNames.length}`);

  for (const sName of serviceNames) {
    const trimmed = sName.trim();
    if (!trimmed || trimmed === "traefik-ingress_traefik") continue;

    console.log(`\n======================================================`);
    console.log(`SERVIÇO: ${trimmed}`);
    console.log(`======================================================`);

    const psRes = await SshConnectionManager.execCommand(server, `docker service ps ${trimmed} --no-trunc | head -n 5`);
    console.log("Tarefas recentes:");
    console.log(psRes.out.trim());

    const logsRes = await SshConnectionManager.execCommand(server, `docker service logs --tail 15 ${trimmed} 2>&1`);
    console.log("Últimos logs:");
    console.log(logsRes.out.trim());
  }

  await SshConnectionManager.closeAll();
}

checkAllServiceErrors().catch(console.error);
