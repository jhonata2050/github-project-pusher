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

async function checkDisk() {
  const server = await getActiveClusterServer();

  console.log("=== 1. DISCO DO SERVIDOR (df -h) ===");
  const dfRes = await SshConnectionManager.execCommand(server, "df -h");
  console.log(dfRes.out);

  console.log("\n=== 2. USO DE DISCO DO DOCKER (docker system df) ===");
  const dockerDfRes = await SshConnectionManager.execCommand(server, "docker system df");
  console.log(dockerDfRes.out);

  console.log("\n=== 3. DIRETÓRIOS MAIS PESADOS EM /var ===");
  const duVar = await SshConnectionManager.execCommand(server, "du -sh /var/lib/docker /var/lib/containerd /var/log /tmp 2>/dev/null");
  console.log(duVar.out);

  console.log("\n=== 4. MAIORES ARQUIVOS DE LOG EM /var/lib/docker/containers ===");
  const duLogs = await SshConnectionManager.execCommand(server, "find /var/lib/docker/containers/ -name '*-json.log' -exec du -sh {} + 2>/dev/null | sort -rh | head -n 15");
  console.log(duLogs.out);

  console.log("\n=== 5. MAIORES DIRETÓRIOS EM / (du -h -d 1 /) ===");
  const duRoot = await SshConnectionManager.execCommand(server, "du -h -d 1 / 2>/dev/null | sort -rh | head -n 15");
  console.log(duRoot.out);

  await SshConnectionManager.closeAll();
}

checkDisk().catch(console.error);
