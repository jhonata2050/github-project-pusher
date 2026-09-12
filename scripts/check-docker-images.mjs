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

async function checkDockerImagesAndTasks() {
  const server = await getActiveClusterServer();

  console.log("=== LISTA DE IMAGENS DOCKER NO SERVIDOR ===");
  const images = await SshConnectionManager.execCommand(server, "docker image ls --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.ID}}'");
  console.log(images.out);

  console.log("\n=== TAREFAS REJEITADAS / FALHAS NO SWARM ===");
  const rejected = await SshConnectionManager.execCommand(server, "docker service ps $(docker service ls -q) --filter 'desired-state=running' --no-trunc | grep -v 'Running'");
  console.log(rejected.out);

  await SshConnectionManager.closeAll();
}

checkDockerImagesAndTasks().catch(console.error);
