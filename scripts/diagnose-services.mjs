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

async function diagnose() {
  console.log("=== DIAGNÓSTICO PROFUNDO DOS SERVIÇOS E DOCKER SWARM ===");
  const server = await getActiveClusterServer();
  console.log(`Conectando ao host: ${server.host || server.serverIp}:${server.sshPort || 30795}...`);

  // 1. Verificar nós do Swarm
  console.log("\n--- 1. ESTADO DOS NÓS DO CLUSTER DOCKER SWARM ---");
  const nodes = await SshConnectionManager.execCommand(server, "docker node ls", { timeoutMs: 15000 });
  console.log(nodes.out);

  // 2. Listar serviços do Docker Swarm
  console.log("\n--- 2. LISTA DE SERVIÇOS SWARM (`docker service ls`) ---");
  const services = await SshConnectionManager.execCommand(server, "docker service ls", { timeoutMs: 15000 });
  console.log(services.out);

  // 3. Contêineres em execução (`docker ps`)
  console.log("\n--- 3. CONTÊINERES EM EXECUÇÃO (`docker ps`) ---");
  const ps = await SshConnectionManager.execCommand(server, "docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}'", { timeoutMs: 15000 });
  console.log(ps.out);

  // 4. Inspecionar Caddy (Reverse Proxy)
  console.log("\n--- 4. ESTADO DO CADDY (REVERSE PROXY) ---");
  const caddyPs = await SshConnectionManager.execCommand(server, "docker service ps caddy --no-trunc", { timeoutMs: 15000 });
  console.log(caddyPs.out);

  // 5. Inspecionar Logs do Caddy (últimas 30 linhas)
  console.log("\n--- 5. LOGS RECENTES DO CADDY ---");
  const caddyLogs = await SshConnectionManager.execCommand(server, "docker service logs --tail 30 caddy 2>&1", { timeoutMs: 15000 });
  console.log(caddyLogs.out);

  // 6. Verificar portas 80 e 443 escutando no Host
  console.log("\n--- 6. PORTAS 80, 443 e 30795 NO HOST ---");
  const ports = await SshConnectionManager.execCommand(server, "ss -tulpn | grep -E ':80|:443|:30795'", { timeoutMs: 15000 });
  console.log(ports.out);

  // 7. Obter aplicações salvas no banco
  console.log("\n--- 7. APLICAÇÕES REGISTRADAS NO BANCO EQSAM ---");
  const appStore = await getApplicationsStore();
  const appList = Object.values(appStore);
  console.log(`Total de aplicações cadastradas: ${appList.length}`);
  for (const app of appList) {
    console.log(`- App: [${app.id}] ${app.name} | FQDN: ${app.fqdn} | Subdomain: ${app.default_subdomain} | Status: ${app.status} | Stack: ${app.stack_name}`);
  }

  // 8. Teste de Curl direto local no host
  console.log("\n--- 8. TESTE DE CURL LOCAL NO HOST (HTTP & HTTPS) ---");
  const curlLocal = await SshConnectionManager.execCommand(server, "curl -Iv -k --connect-timeout 5 http://127.0.0.1 2>&1 | head -n 25", { timeoutMs: 15000 });
  console.log(curlLocal.out);

  if (appList.length > 0) {
    const testApp = appList[0];
    console.log(`\n--- 9. TESTE DE CURL NO HOST PARA O DOMÍNIO: ${testApp.fqdn} ---`);
    const curlApp = await SshConnectionManager.execCommand(server, `curl -Iv -k --connect-timeout 5 "http://${testApp.fqdn}" 2>&1 | head -n 30`, { timeoutMs: 15000 });
    console.log(curlApp.out);

    if (testApp.stack_name) {
      console.log(`\n--- 10. ESTADO DAS TAREFAS DA STACK DO APP: ${testApp.stack_name} ---`);
      const stackPs = await SshConnectionManager.execCommand(server, `docker stack ps ${testApp.stack_name} --no-trunc 2>&1 | head -n 20`, { timeoutMs: 15000 });
      console.log(stackPs.out);
      
      const stackLogs = await SshConnectionManager.execCommand(server, `docker service logs --tail 25 ${testApp.stack_name}_app 2>&1`, { timeoutMs: 15000 });
      console.log(stackLogs.out);
    }
  }

  await SshConnectionManager.closeAll();
  console.log("\n=== DIAGNÓSTICO CONCLUÍDO ===");
}

diagnose().catch((err) => {
  console.error("Erro no diagnóstico:", err);
  process.exit(1);
});
