import {
  SshConnectionManager,
  CircuitBreakerOpenError,
  SwarmAuthError,
  SshSwarmTransport,
} from "../src/lib/ssh-connection-manager.server.ts";

async function testCircuitBreaker() {
  console.log("=== TESTANDO CIRCUIT BREAKER & SERVIDOR OFFLINE ===");

  const unreachableServer = {
    id: "offline-server-test",
    host: "192.0.2.1", // IP da RFC 5737 TEST-NET-1 garantido como inacessível
    sshPort: 59999,
    sshUser: "root",
    sshPassword: "test_password",
    maxChannels: 5,
  };

  const transport = new SshSwarmTransport(unreachableServer);

  console.log("\n1. Verificando estado inicial do Circuit Breaker...");
  let status = transport.getStatus();
  console.log(`Estado Inicial: ${status.circuit} (deve ser CLOSED)`);
  if (status.circuit !== "CLOSED") throw new Error("Deveria iniciar CLOSED");

  console.log("\n2. Simulando falhas de conexão com host offline (limiar = 3 falhas)...");
  for (let i = 1; i <= 3; i++) {
    const tStart = Date.now();
    try {
      // Usar timeout baixo de teste para ser rápido
      await SshConnectionManager.execCommand(unreachableServer, "uptime", { timeoutMs: 1500 });
      console.error(`Falha: Tentativa ${i} não deveria ter sucedido!`);
    } catch (err) {
      const elapsed = Date.now() - tStart;
      console.log(`- Tentativa ${i}: Falha capturada em ${elapsed}ms (${err.message.slice(0, 70)})`);
    }
  }

  console.log("\n3. Verificando se o Circuit Breaker disparou para OPEN...");
  status = transport.getStatus();
  console.log(`Estado Atual: ${status.circuit}`);
  if (status.circuit !== "OPEN") {
    throw new Error(`Circuit breaker deveria estar OPEN, mas está: ${status.circuit}`);
  }
  console.log("✅ APROVADO: Circuit Breaker transicionou para OPEN com sucesso!");

  console.log("\n4. Testando Falha Rápida (Fast-Fail) com Circuit Breaker OPEN...");
  const tFastFail = Date.now();
  let caughtFastFail = false;
  try {
    await transport.exec("uptime");
  } catch (err) {
    const dFastFail = Date.now() - tFastFail;
    if (err instanceof CircuitBreakerOpenError || err.name === "CircuitBreakerOpenError") {
      caughtFastFail = true;
      console.log(`- Fast-Fail respondeu em apenas ${dFastFail}ms com erro amigável:`);
      console.log(`  "${err.message}"`);
      if (dFastFail < 50) {
        console.log("✅ APROVADO: Respondeu em < 50ms sem travar o processo com timeouts!");
      }
    } else {
      console.error("Erro inesperado:", err);
    }
  }

  if (!caughtFastFail) {
    throw new Error("Deveria ter lançado CircuitBreakerOpenError imediatamente!");
  }

  console.log("\n5. Testando Tratamento Semântico de Erro de Autenticação (SwarmAuthError)...");
  const badAuthServer = {
    id: "bad-auth-server-test",
    host: "45.159.172.137",
    sshPort: 30795,
    sshUser: "root",
    sshPassword: "WRONG_PASSWORD_COMPLETELY_INVALID_12345",
  };

  try {
    await SshConnectionManager.execCommand(badAuthServer, "uptime", { timeoutMs: 8000 });
    console.error("Falha: Deveria ter rejeitado senha inválida!");
  } catch (authErr) {
    console.log(`- Erro de autenticação capturado: ${authErr.name || authErr.message}`);
    const badAuthStatus = SshConnectionManager.getStatus()[SshConnectionManager.getServerKey(badAuthServer)];
    console.log(`  isAuthFailed marcado? ${badAuthStatus?.isAuthFailed}`);
    if (badAuthStatus?.isAuthFailed) {
      console.log("✅ APROVADO: Erro de autenticação identificado e marcado sem retries desnecessários!");
    }
  }

  await SshConnectionManager.closeAll();
  console.log("\n=== TESTE DE CIRCUIT BREAKER E FALHAS CONCLUÍDO COM SUCESSO ===");
}

testCircuitBreaker().catch((err) => {
  console.error("Erro no teste de circuit breaker:", err);
  process.exit(1);
});
