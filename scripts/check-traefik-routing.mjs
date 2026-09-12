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

const { getActiveClusterServer } = await import("../src/lib/cloud-apps.server.ts");
const { SshConnectionManager } = await import("../src/lib/ssh-connection-manager.server.ts");

async function checkTraefikRouting() {
  const server = await getActiveClusterServer();

  console.log("=== 1. LOGS RECENTES DO TRAEFIK ===");
  const traefikLogs = await SshConnectionManager.execCommand(server, "docker service logs --tail 40 traefik-ingress_traefik 2>&1");
  console.log(traefikLogs.out);

  console.log("\n=== 2. LABELS DO SERVIÇO UPTIME KUMA (app_2a4782817f604b6f_app) ===");
  const kumaInspect = await SshConnectionManager.execCommand(server, "docker service inspect app_2a4782817f604b6f_app --format '{{json .Spec.Labels}}'");
  console.log("Labels:", kumaInspect.out);

  console.log("\n=== 3. LABELS DO SERVIÇO NGINX (app_b211efedd5fc46fd_web) ===");
  const nginxInspect = await SshConnectionManager.execCommand(server, "docker service inspect app_b211efedd5fc46fd_web --format '{{json .Spec.Labels}}'");
  console.log("Labels:", nginxInspect.out);

  console.log("\n=== 4. TESTAR CURL LOCAL COM HOST HEADER ===");
  const testHosts = [
    "kuma-2a4782817f60.dk1.eqsam.com",
    "app-b211efedd5fc.dk1.eqsam.com",
    "wordpress-be0003d98aa7.dk1.eqsam.com"
  ];

  for (const h of testHosts) {
    console.log(`\n--- Testando HTTP para Host: ${h} ---`);
    const resHttp = await SshConnectionManager.execCommand(server, `curl -Iv -k --connect-timeout 5 -H "Host: ${h}" http://127.0.0.1 2>&1 | grep -E '< HTTP|< Location|404|502|503'`);
    console.log("HTTP:", resHttp.out.trim());

    console.log(`--- Testando HTTPS para Host: ${h} ---`);
    const resHttps = await SshConnectionManager.execCommand(server, `curl -Iv -k --connect-timeout 5 -H "Host: ${h}" https://127.0.0.1 2>&1 | grep -E '< HTTP|< Location|404|502|503'`);
    console.log("HTTPS:", resHttps.out.trim());
  }

  console.log("\n=== 5. REDES DOCKER (DOCKER NETWORK LS) ===");
  const networks = await SshConnectionManager.execCommand(server, "docker network ls");
  console.log(networks.out);

  console.log("\n=== 6. VERIFICAR SE O TRAEFIK ESTÁ NA MESMA REDE DOS APPS ===");
  const traefikNets = await SshConnectionManager.execCommand(server, "docker service inspect traefik-ingress_traefik --format '{{json .Spec.TaskTemplate.Networks}}'");
  console.log("Traefik networks:", traefikNets.out);

  await SshConnectionManager.closeAll();
}

checkTraefikRouting().catch(console.error);
