import {
  CircuitBreakerOpenError,
  SwarmAuthError,
  CIRCUIT_FAILURE_THRESHOLD,
  CIRCUIT_COOLDOWN_MS,
  type ManagedConnectionEntry,
} from "./types.ts";
import { sshMetrics } from "./state.ts";

/**
 * Verifica o estado do Circuit Breaker para o servidor.
 */
export function checkCircuit(entry: ManagedConnectionEntry): void {
  const now = Date.now();

  // Se houve erro permanente de autenticação, não permite retries automáticos rápidos
  if (entry.circuit.isAuthFailed) {
    throw new SwarmAuthError(
      entry.serverKey,
      "Credenciais SSH inválidas ou rejeitadas pelo host Swarm. Verifique as configurações do servidor."
    );
  }

  if (entry.circuit.state === "OPEN") {
    if (now >= entry.circuit.openUntil) {
      // Transição de OPEN para HALF_OPEN para teste controlado (canary)
      entry.circuit.state = "HALF_OPEN";
      console.log(`[Circuit Breaker] ${entry.serverKey} transicionou para HALF_OPEN (testando recuperação...)`);
    } else {
      const waitTime = entry.circuit.openUntil - now;
      throw new CircuitBreakerOpenError(entry.serverKey, waitTime);
    }
  }
}

/**
 * Registra sucesso no Circuit Breaker, restabelecendo estado CLOSED.
 */
export function recordSuccess(entry: ManagedConnectionEntry): void {
  if (entry.circuit.state !== "CLOSED" || entry.circuit.consecutiveNetworkFailures > 0) {
    console.log(`[Circuit Breaker] ${entry.serverKey} recuperado com sucesso. Estado: CLOSED`);
  }
  entry.circuit.state = "CLOSED";
  entry.circuit.consecutiveNetworkFailures = 0;
  entry.circuit.openUntil = 0;
  entry.circuit.isAuthFailed = false;
  entry.reconnectAttempts = 0;
}

/**
 * Registra falha e atualiza o Circuit Breaker conforme o tipo semântico do erro.
 */
export function recordFailure(entry: ManagedConnectionEntry, error: unknown): void {
  const errObj = error as any;
  const errMsg = String(errObj?.message || error || "").toLowerCase();
  const errCode = String(errObj?.code || "").toLowerCase();

  // 1. Falha de autenticação (não transitória)
  const isAuth =
    errMsg.includes("authentication") ||
    errMsg.includes("auth fail") ||
    errMsg.includes("all configured authentication methods failed");

  if (isAuth) {
    entry.circuit.isAuthFailed = true;
    entry.state = "failed";
    console.error(`[SSH Manager] Falha fatal de autenticação em ${entry.serverKey}: ${errMsg}`);
    return;
  }

  // 2. Falha de rede transitória (timeout, connection refused, host unreachable)
  const isNetwork =
    errCode === "etimedout" ||
    errCode === "econnrefused" ||
    errCode === "ehostunreach" ||
    errCode === "enetunreach" ||
    errMsg.includes("timed out") ||
    errMsg.includes("timeout") ||
    errMsg.includes("connection closed") ||
    errMsg.includes("socket closed");

  if (isNetwork) {
    entry.circuit.consecutiveNetworkFailures++;
    entry.circuit.lastFailureTime = Date.now();

    if (entry.circuit.consecutiveNetworkFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      entry.circuit.state = "OPEN";
      entry.circuit.openUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
      sshMetrics.circuitTrips++;
      console.warn(
        `[Circuit Breaker] ${entry.serverKey} atingiu ${entry.circuit.consecutiveNetworkFailures} falhas consecutivas. Estado: OPEN por ${CIRCUIT_COOLDOWN_MS / 1000}s.`
      );
    }
  }
}
