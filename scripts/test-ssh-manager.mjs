import { SshConnectionManager, SshSwarmTransport } from "../src/lib/ssh-connection-manager.server.ts";

async function runTest() {
  console.log("=== TESTANDO SSH CONNECTION MANAGER & SWARM TRANSPORT ===");

  const server = {
    id: "test-cluster-server",
    host: "45.159.172.137",
    sshPort: 30795,
    sshUser: "root",
    sshPassword: process.env.SWARM_SSH_PASSWORD || "uvU8Ly3S6IaXW1fE",
    maxChannels: 5,
  };

  const transport = new SshSwarmTransport(server);

  // 1. Primeira chamada (inclui handshake SSH)
  console.log("\n1. Executando Comando 1 (Primeira Conexão + Handshake)...");
  const t0 = Date.now();
  const res1 = await transport.exec("uptime", { label: "teste-uptime-1" });
  const d1 = Date.now() - t0;
  console.log(`- Comando 1 finalizado em ${d1}ms (${(d1 / 1000).toFixed(3)}s)`);
  console.log(`  Saída: ${res1.out.trim()}`);

  // 2. Segunda chamada (REUTILIZA conexão persistente)
  console.log("\n2. Executando Comando 2 (Reutilizando Conexão Persistente existente)...");
  const t1 = Date.now();
  const res2 = await transport.exec("docker service ls --format '{{.Name}}'", { label: "teste-service-ls" });
  const d2 = Date.now() - t1;
  console.log(`- Comando 2 finalizado em ${d2}ms (${(d2 / 1000).toFixed(3)}s)`);
  console.log(`  Serviços encontrados: ${res2.out.trim().split("\n").length}`);

  // 3. Terceira chamada (docker stats sobre conexão ativa)
  console.log("\n3. Executando Comando 3 (docker stats sobre conexão ativa)...");
  const t2 = Date.now();
  const res3 = await transport.exec('docker stats --no-stream --format "{{json .}}"', { label: "teste-docker-stats" });
  const d3 = Date.now() - t2;
  console.log(`- Comando 3 finalizado em ${d3}ms (${(d3 / 1000).toFixed(3)}s)`);
  console.log(`  Containers coletados: ${res3.out.trim().split("\n").length}`);

  // 4. Testando Concorrência Multiplexada (3 comandos paralelos simultâneos)
  console.log("\n4. Executando 3 comandos paralelos sobre a mesma conexão...");
  const tParallel = Date.now();
  const [p1, p2, p3] = await Promise.all([
    transport.exec("echo 'parallel 1'", { label: "parallel-1" }),
    transport.exec("echo 'parallel 2'", { label: "parallel-2" }),
    transport.exec("echo 'parallel 3'", { label: "parallel-3" }),
  ]);
  const dParallel = Date.now() - tParallel;
  console.log(`- 3 comandos simultâneos executados juntos em ${dParallel}ms (${(dParallel / 1000).toFixed(3)}s)`);
  console.log(`  Resultados: "${p1.out.trim()}", "${p2.out.trim()}", "${p3.out.trim()}"`);

  // 5. Inspecionando Status do Pool
  console.log("\n5. Status do Pool de Conexões:");
  console.log(JSON.stringify(SshConnectionManager.getStatus(), null, 2));

  await SshConnectionManager.closeAll();
  console.log("\n=== TESTE CONCLUÍDO COM SUCESSO ===");
}

runTest().catch((err) => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
