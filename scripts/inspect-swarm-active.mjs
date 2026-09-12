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

async function checkRunning() {
  const server = await getActiveClusterServer();
  
  console.log("=== 1. DOCKER SERVICE LS ===");
  const svc = await SshConnectionManager.execCommand(server, "docker service ls");
  console.log(svc.out);

  console.log("\n=== 2. DOCKER STACK LS ===");
  const stacks = await SshConnectionManager.execCommand(server, "docker stack ls");
  console.log(stacks.out);

  console.log("\n=== 3. DOCKER PS (SOMENTE CONTÊINERES ATIVOS) ===");
  const running = await SshConnectionManager.execCommand(server, "docker ps --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'");
  console.log(running.out);

  console.log("\n=== 4. TESTAR REVERSE PROXY VIA HTTPS (443) ===");
  const curlHttps = await SshConnectionManager.execCommand(server, "curl -Iv -k https://127.0.0.1 2>&1 | head -n 30");
  console.log(curlHttps.out);

  await SshConnectionManager.closeAll();
}

checkRunning().catch(console.error);
