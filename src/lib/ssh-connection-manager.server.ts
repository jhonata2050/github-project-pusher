/**
 * SSH Connection Manager & Swarm Transport Layer (Fachada Retrocompatível)
 * 
 * Mantém 100% de compatibilidade retroativa com rotas e scripts existentes (Lei #6 de Engenharia),
 * delegando as operações para a arquitetura modular sob `src/lib/ssh/`.
 */

import type { Client } from "ssh2";
import {
  type ConnectionState,
  type CircuitState,
  type ServerEndpointConfig,
  type ExecOptions,
  type ExecResult,
  type SshManagerMetrics,
  type SwarmTransport,
  CircuitBreakerOpenError,
  SwarmAuthError,
  SshTimeoutError,
  getServerKey,
  getStatus,
  getMetrics,
  resetMetrics,
  isConnectionAlive,
  getConnection,
  closeAll,
  execCommand,
  uploadBuffer,
  SshSwarmTransport,
} from "./ssh/index.ts";

export {
  type ConnectionState,
  type CircuitState,
  type ServerEndpointConfig,
  type ExecOptions,
  type ExecResult,
  type SshManagerMetrics,
  type SwarmTransport,
  CircuitBreakerOpenError,
  SwarmAuthError,
  SshTimeoutError,
  SshSwarmTransport,
};

export class SshConnectionManager {
  public static getServerKey(server: ServerEndpointConfig): string {
    return getServerKey(server);
  }

  public static isConnectionAlive(client: Client | null): boolean {
    return isConnectionAlive(client);
  }

  public static async getConnection(server: ServerEndpointConfig): Promise<Client> {
    return getConnection(server);
  }

  public static async execCommand(
    server: ServerEndpointConfig,
    command: string,
    options?: ExecOptions
  ): Promise<ExecResult> {
    return execCommand(server, command, options);
  }

  public static async uploadBuffer(
    server: ServerEndpointConfig,
    remotePath: string,
    buffer: Buffer
  ): Promise<void> {
    return uploadBuffer(server, remotePath, buffer);
  }

  public static getStatus(): Record<string, unknown> {
    return getStatus();
  }

  public static getMetrics(): SshManagerMetrics {
    return getMetrics();
  }

  public static resetMetrics(): void {
    resetMetrics();
  }

  public static async closeAll(): Promise<void> {
    return closeAll();
  }
}

// Limpeza graciosa ao encerrar o processo Node.js
if (typeof process !== "undefined" && process.on) {
  process.on("SIGTERM", () => SshConnectionManager.closeAll());
  process.on("SIGINT", () => SshConnectionManager.closeAll());
}
