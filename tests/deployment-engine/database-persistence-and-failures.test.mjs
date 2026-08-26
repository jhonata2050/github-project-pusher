import { DatabaseOrchestrator } from "../../src/lib/deployment-engine/database-providers/orchestrator.js";
import { DeploymentStateMachine } from "../../src/lib/deployment-engine/state-machine.js";
import { DeploymentDiagnosticsService } from "../../src/lib/deployment-engine/diagnostics.js";

function runDatabasePersistenceAndFailuresTests() {
  console.log("==================================================");
  console.log("TESTES DE PERSISTÊNCIA, RESTART, STATE MACHINE & FALHAS");
  console.log("==================================================");

  // -------------------------------------------------------------
  // 1. STATE MACHINE PARA BANCOS DE DADOS
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 1]: State Machine para Bancos (Sem exigência de Domínio Web)");

  const dbService = DatabaseOrchestrator.createDatabaseService({
    id: "pg_sm_test",
    userId: "user_456",
    name: "PostgreSQL Production",
    engine: "postgresql",
  });

  const session = {
    deploymentUuid: "dep_db_123",
    appId: dbService.id,
    appName: dbService.name,
    userId: dbService.userId,
    currentState: "QUEUED",
    steps: [],
    validationPolicy: dbService.validationPolicy, // requireDomainVerification: false
    startedAt: new Date().toISOString(),
  };

  const sm = new DeploymentStateMachine(session);

  sm.transition("VALIDATING", "Validando recursos e volume de dados");
  sm.transition("BUILDING", "Alocando imagem e volume persistente");
  sm.transition("STARTING", "Iniciando container PostgreSQL");
  sm.transition("HEALTH_CHECKING", "Executando sonda pg_isready");
  sm.transition("READY", "Banco de dados saudável e aceitando conexões");

  if (sm.getState() !== "READY" || !sm.isSuccessful()) {
    throw new Error(`Falha no ciclo da State Machine do banco: ${sm.getState()}`);
  }
  console.log("  ✔ State Machine para Banco de Dados (QUEUED -> READY): PASS");

  // -------------------------------------------------------------
  // 2. PERSISTÊNCIA DE DADOS EM RESTART E RECIAÇÃO DE CONTAINER
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 2]: Imutabilidade de Volume Persistente em Restart & Recriação");

  const originalVolumeName = dbService.volume.volumeName;
  const originalMountPath = dbService.volume.mountPath;

  // Simular recriação do container (rebuild / restart de imagem)
  const recreatedPlan = DatabaseOrchestrator.getProvisionPlan(dbService);

  if (
    recreatedPlan.volumeName !== originalVolumeName ||
    recreatedPlan.mountPath !== originalMountPath ||
    !dbService.volume.protected
  ) {
    throw new Error("Falha na persistência: Volume foi alterado durante a recriação do container!");
  }
  console.log("  ✔ Persistência Imutável: Volume e ponto de montagem preservados intactos: PASS");

  // -------------------------------------------------------------
  // 3. CONEXÃO CROSS-NODE (MULTI-VPS)
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 3]: Resolução de Conexão Cross-Node (Multi-VPS / Nós Separados)");

  const dbCrossNode = DatabaseOrchestrator.createDatabaseService({
    id: "pg_cross",
    userId: "user_789",
    name: "PG Node B",
    engine: "postgresql",
    nodeId: "vps-node-db-02",
    nodeHost: "45.159.172.99",
    enablePublicAccess: true,
    publicPort: 15432,
  });

  const appLocalEnvs = DatabaseOrchestrator.injectConnectionIntoApp([], dbCrossNode, true);
  const appRemoteEnvs = DatabaseOrchestrator.injectConnectionIntoApp([], dbCrossNode, false);

  const localHost = appLocalEnvs.find((e) => e.key === "DB_HOST")?.value;
  const remoteHost = appRemoteEnvs.find((e) => e.key === "DB_HOST")?.value;
  const remotePort = appRemoteEnvs.find((e) => e.key === "DB_PORT")?.value;

  if (localHost !== "eqsam_postgresql_pg_cross" || remoteHost !== "45.159.172.99" || remotePort !== "15432") {
    throw new Error(`Falha na resolução cross-node: localHost=${localHost}, remoteHost=${remoteHost}, remotePort=${remotePort}`);
  }
  console.log("  ✔ Resolução Cross-Node (Host Interno vs IP do Node com Porta Mapeada): PASS");

  // -------------------------------------------------------------
  // 4. TRADUÇÃO DE DIAGNÓSTICOS DE FALHAS DE BANCO DE DADOS
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 4]: Diagnósticos Didáticos de Falhas de Banco de Dados");

  // 4.1 Falha de Autenticação PostgreSQL
  const diagAuth = DeploymentDiagnosticsService.diagnose("FATAL: password authentication failed for user 'postgres'");
  if (diagAuth.code !== "ERR_DB_AUTH_FAILED" || diagAuth.action?.type !== "configure_env") {
    throw new Error(`Falha no diagnóstico de autenticação: ${JSON.stringify(diagAuth)}`);
  }

  // 4.2 Falha de Conexão Recusada (PostgreSQL / MySQL não iniciado)
  const diagConn = DeploymentDiagnosticsService.diagnose("connect ECONNREFUSED 127.0.0.1:5432 at TCPConnectWrap");
  if (diagConn.code !== "ERR_CONN_REFUSED" || !diagConn.description.includes("PostgreSQL")) {
    throw new Error(`Falha no diagnóstico ECONNREFUSED 5432: ${JSON.stringify(diagConn)}`);
  }

  // 4.3 Falha de Disco Cheio
  const diagDisk = DeploymentDiagnosticsService.diagnose("FATAL: could not extend file 'base/16384/2683': No space left on device");
  if (diagDisk.code !== "ERR_DISK_FULL") {
    throw new Error(`Falha no diagnóstico de disco cheio: ${JSON.stringify(diagDisk)}`);
  }
  console.log("  ✔ Diagnósticos de Autenticação, ECONNREFUSED e Disco Cheio: PASS");

  console.log("\n==================================================");
  console.log("🎉 TODOS OS TESTES DE PERSISTÊNCIA E FALHAS PASSARAM!");
  console.log("==================================================");
}

runDatabasePersistenceAndFailuresTests();
