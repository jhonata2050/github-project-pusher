import { DeploymentStateMachine } from "../../src/lib/deployment-engine/state-machine.js";

function runStateMachineTests() {
  console.log("▶ [TEST]: State Machine Transitions & Invariants");

  const mockSession = {
    deploymentUuid: "dep-test-123",
    appId: "app-test-123",
    appName: "Test App",
    userId: "user-123",
    currentState: "QUEUED",
    steps: [],
    validationPolicy: {
      requireHealthcheck: true,
      requireDomainVerification: true,
    },
    startedAt: new Date().toISOString(),
  };

  const sm = new DeploymentStateMachine(mockSession);

  // 1. Initial state
  if (sm.getState() !== "QUEUED") {
    throw new Error(`Expected initial state QUEUED, got ${sm.getState()}`);
  }

  // 2. Legal transition QUEUED -> VALIDATING
  sm.transition("VALIDATING", "Validando arquivos do projeto");
  if (sm.getState() !== "VALIDATING") {
    throw new Error(`Expected VALIDATING, got ${sm.getState()}`);
  }

  // 3. Legal transition VALIDATING -> BUILDING
  sm.transition("BUILDING", "Compilando imagem Docker");
  if (sm.getState() !== "BUILDING") {
    throw new Error(`Expected BUILDING, got ${sm.getState()}`);
  }

  // 4. Legal transition BUILDING -> STARTING
  sm.transition("STARTING", "Iniciando container");
  if (sm.getState() !== "STARTING") {
    throw new Error(`Expected STARTING, got ${sm.getState()}`);
  }

  // 5. Legal transition STARTING -> HEALTH_CHECKING
  sm.transition("HEALTH_CHECKING", "Executando sonda HTTP");
  if (sm.getState() !== "HEALTH_CHECKING") {
    throw new Error(`Expected HEALTH_CHECKING, got ${sm.getState()}`);
  }

  // 6. Legal transition HEALTH_CHECKING -> VERIFYING_DOMAIN
  sm.transition("VERIFYING_DOMAIN", "Testando rota pública");
  if (sm.getState() !== "VERIFYING_DOMAIN") {
    throw new Error(`Expected VERIFYING_DOMAIN, got ${sm.getState()}`);
  }

  // 7. Legal transition VERIFYING_DOMAIN -> READY
  sm.transition("READY", "Aplicação 100% online");
  if (sm.getState() !== "READY" || !sm.isSuccessful()) {
    throw new Error(`Expected READY, got ${sm.getState()}`);
  }

  // 8. Illegal transition test (e.g. READY directly to HEALTH_CHECKING without rebuild/restart)
  let caughtError = false;
  try {
    sm.transition("HEALTH_CHECKING", "Transição ilegal");
  } catch {
    caughtError = true;
  }
  if (!caughtError) {
    throw new Error("Failed to block illegal transition from READY to HEALTH_CHECKING");
  }

  console.log("  ✔ State Machine Transitions: PASS");
}

runStateMachineTests();
