import type { Client } from "ssh2";

export type ConnectionState =
  | "connecting"
  | "connected"
  | "ready"
  | "degraded"
  | "disconnected"
  | "reconnecting"
  | "failed";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface ServerEndpointConfig {
  id?: string | undefined;
  serverIp?: string | undefined;
  host?: string | undefined;
  sshPort?: number | undefined;
  sshUser?: string | undefined;
  sshPassword?: string | undefined;
  sshKey?: string | undefined;
  apiToken?: string | undefined;
  maxChannels?: number | undefined;
}

export interface ExecOptions {
  timeoutMs?: number | undefined;
  label?: string | undefined;
}

export interface ExecResult {
  code: number;
  out: string;
}

export class CircuitBreakerOpenError extends Error {
  public readonly serverKey: string;
  public readonly retryAfterMs: number;

  constructor(serverKey: string, retryAfterMs: number) {
    super(
      `[Circuit Breaker OPEN] O servidor Swarm (${serverKey}) está temporariamente indisponível. Aguarde ${Math.ceil(
        retryAfterMs / 1000
      )}s para nova tentativa automática.`
    );
    this.name = "CircuitBreakerOpenError";
    this.serverKey = serverKey;
    this.retryAfterMs = retryAfterMs;
  }
}

export class SwarmAuthError extends Error {
  public readonly serverKey: string;

  constructor(serverKey: string, message: string) {
    super(`[SSH Auth Error] Falha de autenticação com o servidor Swarm (${serverKey}): ${message}`);
    this.name = "SwarmAuthError";
    this.serverKey = serverKey;
  }
}

export class SshTimeoutError extends Error {
  public readonly command: string;
  public readonly timeoutMs: number;

  constructor(command: string, timeoutMs: number) {
    super(`[SSH Timeout] O comando excedeu o limite de ${timeoutMs}ms: "${command.slice(0, 60)}..."`);
    this.name = "SshTimeoutError";
    this.command = command;
    this.timeoutMs = timeoutMs;
  }
}

export interface CircuitBreakerState {
  state: CircuitState;
  consecutiveNetworkFailures: number;
  lastFailureTime: number;
  openUntil: number;
  isAuthFailed: boolean;
}

export interface ChannelQueueItem {
  resolve: () => void;
  reject: (err: Error) => void;
}

export interface ManagedConnectionEntry {
  serverKey: string;
  server: ServerEndpointConfig;
  client: Client | null;
  state: ConnectionState;
  activeChannels: number;
  maxChannels: number;
  channelQueue: ChannelQueueItem[];
  circuit: CircuitBreakerState;
  connectPromise: Promise<Client> | null;
  lastUsedAt: number;
  createdAt: number;
  reconnectAttempts: number;
  reconnectTimer: NodeJS.Timeout | null;
}

export interface SshManagerMetrics {
  sshConnectionsCreated: number;
  sshConnectionsReused: number;
  sshConnectionsClosed: number;
  sshReconnects: number;
  sshHandshakes: number;
  sshChannelsCreated: number;
  sshChannelsReleased: number;
  circuitTrips: number;
}

export interface EqsamSshGlobals {
  __eqsam_ssh_metrics?: SshManagerMetrics;
  __eqsam_ssh_registry?: Map<string, ManagedConnectionEntry>;
}

export interface SwarmTransport {
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  uploadBuffer?(remotePath: string, buffer: Buffer): Promise<void>;
  getStatus(): { state: ConnectionState; circuit: CircuitState; activeChannels: number };
}

// Configurações e limites padrão
export const DEFAULT_READY_TIMEOUT_MS = 15000;
export const DEFAULT_EXEC_TIMEOUT_MS = 18000;
export const DEFAULT_MAX_CHANNELS = 6;
export const CIRCUIT_FAILURE_THRESHOLD = 3;
export const CIRCUIT_COOLDOWN_MS = 25000;
export const KEEPALIVE_INTERVAL_MS = 10000;
export const KEEPALIVE_COUNT_MAX = 3;
