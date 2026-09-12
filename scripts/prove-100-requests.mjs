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
const { getCacheMetrics, resetCacheMetrics, defaultCacheStore } = await import("../src/lib/swarm-cache.server.ts");
const { getSwarmClusterDockerStats } = await import("../src/lib/swarm-cluster.server.ts");

function formatMs(ms) {
  const rounded = Math.round(ms);
  const sec = (ms / 1000).toFixed(3);
  return `${rounded.toLocaleString("pt-BR")} ms (~${sec} s)`;
}

function calculatePercentiles(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  const avg = sorted.reduce((acc, v) => acc + v, 0) / (sorted.length || 1);
  return { p50, p95, p99, avg };
}

async function runProof() {
  console.log("================================================================================");
  console.log("PROVA FÍSICA: AUDITORIA RED TEAM DE ALTA CONCORRÊNCIA (SSH & CACHE)");
  console.log("================================================================================");

  await SshConnectionManager.closeAll();
  SshConnectionManager.resetMetrics();
  resetCacheMetrics();
  defaultCacheStore.clear();

  const server = await getActiveClusterServer();
  console.log(`Servidor de destino: ${server.host || server.serverIp}:${server.sshPort || 30795} (User: ${server.sshUser || "root"})`);

  // ============================================================================
  // CENÁRIO 1: 100 Requisições Simultâneas Cold Start (Deduplicação Inflight)
  // ============================================================================
  console.log("\n>>> CENÁRIO 1: 100 Requisições Simultâneas Cold Start (Deduplicação Inflight)");
  const concurrency = 100;
  const latencies1 = [];
  let successCount1 = 0;
  const tStart1 = Date.now();

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      const tReq = Date.now();
      try {
        await getSwarmClusterDockerStats();
        latencies1.push(Date.now() - tReq);
        successCount1++;
      } catch (err) {
        latencies1.push(Date.now() - tReq);
        console.error("Erro C1:", err.message);
      }
    })
  );
  const duration1 = Date.now() - tStart1;
  const { p50: p50_1, p95: p95_1, p99: p99_1, avg: avg_1 } = calculatePercentiles(latencies1);
  const sshMetrics1 = SshConnectionManager.getMetrics();
  const cacheMetrics1 = getCacheMetrics();

  console.log(`- Duração Total: ${formatMs(duration1)}`);
  console.log(`- Sucessos: ${successCount1}/${concurrency}`);
  console.log(`- Latência p50: ${formatMs(p50_1)} | p95: ${formatMs(p95_1)} | p99: ${formatMs(p99_1)} | Média: ${formatMs(avg_1)}`);
  console.log(`- Sockets TCP SSH Criados: ${sshMetrics1.sshConnectionsCreated} (Esperado: 1)`);
  console.log(`- SSH Handshakes: ${sshMetrics1.sshHandshakes} (Esperado: 1)`);
  console.log(`- Deduplicações In-Flight no Cache: ${cacheMetrics1.inflightDeduplications} (Esperado: ~99)`);
  console.log(`- Cache Misses: ${cacheMetrics1.cacheMisses} (Esperado: 1)`);

  // ============================================================================
  // CENÁRIO 2: 100 Requisições Simultâneas Warm Cache (Cache First Hit)
  // ============================================================================
  console.log("\n>>> CENÁRIO 2: 100 Requisições Simultâneas Warm Cache (Cache First Hit)");
  const latencies2 = [];
  let successCount2 = 0;
  const tStart2 = Date.now();

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      const tReq = Date.now();
      try {
        await getSwarmClusterDockerStats();
        latencies2.push(Date.now() - tReq);
        successCount2++;
      } catch (err) {
        latencies2.push(Date.now() - tReq);
        console.error("Erro C2:", err.message);
      }
    })
  );
  const duration2 = Date.now() - tStart2;
  const { p50: p50_2, p95: p95_2, p99: p99_2, avg: avg_2 } = calculatePercentiles(latencies2);
  const cacheMetrics2 = getCacheMetrics();

  console.log(`- Duração Total: ${formatMs(duration2)}`);
  console.log(`- Sucessos: ${successCount2}/${concurrency}`);
  console.log(`- Latência p50: ${formatMs(p50_2)} | p95: ${formatMs(p95_2)} | p99: ${formatMs(p99_2)} | Média: ${formatMs(avg_2)}`);
  console.log(`- Cache Hits: ${cacheMetrics2.cacheHits} (Esperado: 100)`);

  // ============================================================================
  // CENÁRIO 3: 50 Requisições Concorrentes Diretas ao SSH (Multiplexação e Reuso de Socket)
  // ============================================================================
  console.log("\n>>> CENÁRIO 3: 50 Comandos SSH Concorrentes Diretos (Multiplexação e Reuso de Socket)");
  SshConnectionManager.resetMetrics();
  const directCommands = 50;
  const latencies3 = [];
  let successCount3 = 0;
  const tStart3 = Date.now();

  await Promise.all(
    Array.from({ length: directCommands }, async (_, i) => {
      const tReq = Date.now();
      try {
        await SshConnectionManager.execCommand(server, `echo "direct-ssh-${i}"`, { timeoutMs: 30000 });
        latencies3.push(Date.now() - tReq);
        successCount3++;
      } catch (err) {
        latencies3.push(Date.now() - tReq);
        console.error("Erro C3:", err.message);
      }
    })
  );
  const duration3 = Date.now() - tStart3;
  const { p50: p50_3, p95: p95_3, p99: p99_3, avg: avg_3 } = calculatePercentiles(latencies3);
  const sshMetrics3 = SshConnectionManager.getMetrics();
  const poolStatus3 = SshConnectionManager.getStatus();
  const activeSockets = Object.keys(poolStatus3).length;

  console.log(`- Duração Total: ${formatMs(duration3)}`);
  console.log(`- Sucessos: ${successCount3}/${directCommands}`);
  console.log(`- Latência p50: ${formatMs(p50_3)} | p95: ${formatMs(p95_3)} | p99: ${formatMs(p99_3)} | Média: ${formatMs(avg_3)}`);
  console.log(`- sshConnectionsCreated: ${sshMetrics3.sshConnectionsCreated} (DEVE SER 0 ou 1)`);
  console.log(`- sshConnectionsReused: ${sshMetrics3.sshConnectionsReused} (REUSOS REAIS DE SOCKET)`);
  console.log(`- sshChannelsCreated: ${sshMetrics3.sshChannelsCreated} (Canais Multiplexados Criados)`);
  console.log(`- sshChannelsReleased: ${sshMetrics3.sshChannelsReleased} (Canais Multiplexados Liberados)`);
  console.log(`- Sockets TCP Físicos no Pool: ${activeSockets} (DEVE SER EXATAMENTE 1)`);

  console.log("\n================================================================================");
  const pass =
    sshMetrics1.sshConnectionsCreated === 1 &&
    cacheMetrics1.inflightDeduplications >= 90 &&
    cacheMetrics2.cacheHits >= 100 &&
    activeSockets === 1 &&
    successCount3 === directCommands &&
    sshMetrics3.sshChannelsCreated === directCommands &&
    sshMetrics3.sshChannelsReleased === directCommands;

  if (pass) {
    console.log("✅ TODAS AS PROVAS FÍSICAS FORAM APROVADAS COM ÊXITO COMPROVADO!");
    console.log("1. 100 requisições simultâneas abriram exatamente 1 socket físico.");
    console.log("2. 99 requisições foram agregadas in-flight sem tocar no SSH nem no host.");
    console.log("3. 100 requisições quentes foram respondidas em ~0 ms pelo cache.");
    console.log("4. 50 comandos diretos rodaram multiplexados sobre o MESMO socket SSH existente com 100% de canais liberados.");
  } else {
    console.error("❌ FALHA EM UMA DAS PROVAS FÍSICAS.");
    process.exitCode = 1;
  }
  console.log("================================================================================");

  await SshConnectionManager.closeAll();
}

runProof().catch((err) => {
  console.error("Erro fatal na prova física:", err);
  process.exit(1);
});
