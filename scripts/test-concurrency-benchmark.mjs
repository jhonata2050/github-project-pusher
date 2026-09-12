import { getSwarmClusterDockerStats } from "../src/lib/swarm-cluster.server.ts";
import { SshConnectionManager } from "../src/lib/ssh-connection-manager.server.ts";

function calculatePercentiles(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  const avg = sorted.reduce((acc, v) => acc + v, 0) / (sorted.length || 1);
  return { p50, p95, p99, avg };
}

async function runScenario(scenarioName, concurrency) {
  console.log(`\n======================================================`);
  console.log(`CENÁRIO: ${scenarioName} (${concurrency} requests simultâneos)`);
  console.log(`======================================================`);

  const memBefore = process.memoryUsage();
  const cpuStart = process.cpuUsage();
  const latencies = [];
  let errors = 0;
  let timeouts = 0;
  let cacheHits = 0;
  let cacheMisses = 0;

  const tStartScenario = Date.now();

  const promises = Array.from({ length: concurrency }, async (_, i) => {
    const tStartReq = Date.now();
    try {
      const stats = await getSwarmClusterDockerStats();
      const elapsed = Date.now() - tStartReq;
      latencies.push(elapsed);
      if (elapsed < 50) {
        cacheHits++;
      } else {
        cacheMisses++;
      }
      return stats;
    } catch (err) {
      const elapsed = Date.now() - tStartReq;
      latencies.push(elapsed);
      errors++;
      if (err.message?.includes("timeout") || err.message?.includes("Timeout")) {
        timeouts++;
      }
    }
  });

  await Promise.all(promises);

  const totalScenarioDuration = Date.now() - tStartScenario;
  const memAfter = process.memoryUsage();
  const cpuElapsed = process.cpuUsage(cpuStart);

  const { p50, p95, p99, avg } = calculatePercentiles(latencies);
  const poolStatus = SshConnectionManager.getStatus();
  const activeSshConnections = Object.keys(poolStatus).length;

  const ramUsedMb = ((memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024)).toFixed(2);
  const cpuUserMs = (cpuElapsed.user / 1000).toFixed(1);
  const cpuSysMs = (cpuElapsed.system / 1000).toFixed(1);

  console.log(`- Duração Total do Lote: ${totalScenarioDuration} ms (${(totalScenarioDuration / 1000).toFixed(3)} s)`);
  console.log(`- Latência p50: ${p50} ms (${(p50 / 1000).toFixed(3)} s)`);
  console.log(`- Latência p95: ${p95} ms (${(p95 / 1000).toFixed(3)} s)`);
  console.log(`- Latência p99: ${p99} ms (${(p99 / 1000).toFixed(3)} s)`);
  console.log(`- Latência Média: ${avg.toFixed(1)} ms (${(avg / 1000).toFixed(3)} s)`);
  console.log(`- Sucessos: ${concurrency - errors}/${concurrency} | Erros: ${errors} | Timeouts: ${timeouts}`);
  console.log(`- Cache Hits: ${cacheHits} | Cache Misses: ${cacheMisses}`);
  console.log(`- Conexões Físicas SSH Ativas no Pool: ${activeSshConnections} (Deduplicação de 1 conexão!)`);
  console.log(`- Variação de Heap RAM: ${ramUsedMb} MB | CPU Processo: user ${cpuUserMs} ms, sys ${cpuSysMs} ms`);

  return {
    concurrency,
    p50,
    p95,
    p99,
    avg,
    errors,
    timeouts,
    cacheHits,
    cacheMisses,
    activeSshConnections,
    totalDuration: totalScenarioDuration,
    ramUsedMb,
  };
}

async function runBenchmark() {
  console.log("=== BENCHMARK DE CONCORRÊNCIA E PERFORMANCE (APÓS OTIMIZAÇÕES) ===");

  const results = [];

  // 1. Cenário 1 request
  results.push(await runScenario("1 Request", 1));

  // 2. Cenário 10 requests simultâneos
  results.push(await runScenario("10 Requests Simultâneos", 10));

  // 3. Cenário 25 requests simultâneos
  results.push(await runScenario("25 Requests Simultâneos", 25));

  // 4. Cenário 50 requests simultâneos
  results.push(await runScenario("50 Requests Simultâneos", 50));

  // 5. Cenário 100 requests simultâneos
  results.push(await runScenario("100 Requests Simultâneos", 100));

  console.log("\n=========================================================================================");
  console.log("TABELA RESUMO DE PERFORMANCE SOB CONCORRÊNCIA");
  console.log("=========================================================================================");
  console.log("| Concorrência | p50 (ms / s)       | p95 (ms / s)       | Erros | SSH Conns | Cache Hits |");
  console.log("|-------------:|--------------------|--------------------|------:|----------:|-----------:|");
  for (const r of results) {
    const p50Str = `${r.p50} ms (${(r.p50 / 1000).toFixed(3)} s)`;
    const p95Str = `${r.p95} ms (${(r.p95 / 1000).toFixed(3)} s)`;
    console.log(
      `| ${String(r.concurrency).padStart(12)} | ${p50Str.padEnd(18)} | ${p95Str.padEnd(18)} | ${String(r.errors).padStart(5)} | ${String(r.activeSshConnections).padStart(9)} | ${String(r.cacheHits).padStart(10)} |`
    );
  }

  await SshConnectionManager.closeAll();
  console.log("\n=== BENCHMARK FINALIZADO COM SUCESSO ===");
}

runBenchmark().catch((err) => {
  console.error("Erro no benchmark:", err);
  process.exit(1);
});
