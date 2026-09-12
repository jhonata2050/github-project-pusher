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

async function findHeavyFiles() {
  const server = await getActiveClusterServer();

  console.log("=== 1. USO DETALHADO DO DOCKER (docker system df -v) ===");
  const sysDf = await SshConnectionManager.execCommand(server, "docker system df");
  console.log(sysDf.out.trim());

  console.log("\n=== 2. TODAS AS IMAGENS NO SERVIDOR COM TAMANHOS ===");
  const images = await SshConnectionManager.execCommand(server, "docker image ls --format 'table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.ID}}'");
  console.log(images.out.trim());

  console.log("\n=== 3. MAIORES VOLUMES DOCKER ===");
  const volumes = await SshConnectionManager.execCommand(server, "du -sh /var/lib/docker/volumes/* 2>/dev/null | sort -rh | head -n 15");
  console.log(volumes.out.trim());

  console.log("\n=== 4. DIRETÓRIO /var/lib/docker/overlay2 ===");
  const overlay2 = await SshConnectionManager.execCommand(server, "du -sh /var/lib/docker/overlay2 2>/dev/null");
  console.log(overlay2.out.trim());

  console.log("\n=== 5. DIRETÓRIO /var/lib/containerd ===");
  const containerd = await SshConnectionManager.execCommand(server, "du -sh /var/lib/containerd 2>/dev/null");
  console.log(containerd.out.trim());

  console.log("\n=== 6. DIRETÓRIO /var/log e journal ===");
  const journal = await SshConnectionManager.execCommand(server, "journalctl --disk-usage");
  console.log(journal.out.trim());

  await SshConnectionManager.closeAll();
}

findHeavyFiles().catch(console.error);
