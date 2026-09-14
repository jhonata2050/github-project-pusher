import {
  type ServerEndpointConfig,
  type ManagedConnectionEntry,
  type SshManagerMetrics,
  type EqsamSshGlobals,
  DEFAULT_MAX_CHANNELS,
} from "./types.ts";

const sshGlobals = globalThis as unknown as EqsamSshGlobals;

export const sshMetrics: SshManagerMetrics =
  sshGlobals.__eqsam_ssh_metrics ||
  (sshGlobals.__eqsam_ssh_metrics = {
    sshConnectionsCreated: 0,
    sshConnectionsReused: 0,
    sshConnectionsClosed: 0,
    sshReconnects: 0,
    sshHandshakes: 0,
    sshChannelsCreated: 0,
    sshChannelsReleased: 0,
    circuitTrips: 0,
  });

/**
 * Registry de conexões ativas gerenciadas por chave única de servidor.
 * Mantido em globalThis para preservar conexões durante recarregamentos HMR em desenvolvimento.
 */
export const connectionRegistry: Map<string, ManagedConnectionEntry> =
  sshGlobals.__eqsam_ssh_registry ||
  (sshGlobals.__eqsam_ssh_registry = new Map<string, ManagedConnectionEntry>());

/**
 * Gera a chave única de conexão por servidor (nunca compartilha conexão entre servidores diferentes).
 */
export function getServerKey(server: ServerEndpointConfig): string {
  const serverId = server.id || "default";
  const host = server.host || server.serverIp || "45.159.172.137";
  const port = server.sshPort || 30795;
  const user = server.sshUser || "root";
  return `${serverId}:${host}:${port}:${user}`;
}

/**
 * Obtém ou inicializa o registro de um servidor.
 */
export function getOrCreateEntry(server: ServerEndpointConfig): ManagedConnectionEntry {
  const key = getServerKey(server);
  let entry = connectionRegistry.get(key);
  if (!entry) {
    const configuredMaxChannels =
      parseInt(process.env['MAX_SSH_CHANNELS_PER_SERVER'] || "", 10) ||
      server.maxChannels ||
      DEFAULT_MAX_CHANNELS;

    entry = {
      serverKey: key,
      server,
      client: null,
      state: "disconnected",
      activeChannels: 0,
      maxChannels: Math.max(2, configuredMaxChannels),
      channelQueue: [],
      circuit: {
        state: "CLOSED",
        consecutiveNetworkFailures: 0,
        lastFailureTime: 0,
        openUntil: 0,
        isAuthFailed: false,
      },
      connectPromise: null,
      lastUsedAt: Date.now(),
      createdAt: Date.now(),
      reconnectAttempts: 0,
      reconnectTimer: null,
    };
    connectionRegistry.set(key, entry);
  } else {
    // Atualizar credenciais se mudaram
    entry.server = server;
  }
  return entry;
}

/**
 * Retorna o status de observabilidade de todas as conexões e circuit breakers gerenciados.
 */
export function getStatus(): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of connectionRegistry.entries()) {
    result[key] = {
      state: entry.state,
      circuit: entry.circuit.state,
      activeChannels: entry.activeChannels,
      maxChannels: entry.maxChannels,
      queueLength: entry.channelQueue.length,
      consecutiveFailures: entry.circuit.consecutiveNetworkFailures,
      isAuthFailed: entry.circuit.isAuthFailed,
      lastUsedAgoSec: Math.round((Date.now() - entry.lastUsedAt) / 1000),
    };
  }
  return result;
}

/**
 * Retorna os contadores operacionais acumulados da camada de transporte SSH.
 */
export function getMetrics(): SshManagerMetrics {
  return { ...sshMetrics };
}

/**
 * Reseta os contadores para permitir medições controladas por cenário.
 */
export function resetMetrics(): void {
  sshMetrics.sshConnectionsCreated = 0;
  sshMetrics.sshConnectionsReused = 0;
  sshMetrics.sshConnectionsClosed = 0;
  sshMetrics.sshReconnects = 0;
  sshMetrics.sshHandshakes = 0;
  sshMetrics.sshChannelsCreated = 0;
  sshMetrics.sshChannelsReleased = 0;
  sshMetrics.circuitTrips = 0;
}
