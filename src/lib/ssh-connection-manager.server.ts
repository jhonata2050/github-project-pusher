/**
 * SSH Connection Manager & Swarm Transport Layer
 * 
 * Gerencia conexões persistentes por servidor com:
 * - Ciclo de vida e estados explícitos (connecting, connected, ready, degraded, disconnected, reconnecting, failed)
 * - Circuit Breaker resiliente com diferenciação semântica de erros (transitório vs autenticação vs aplicação)
 * - Multiplexação de múltiplos canais sobre a mesma conexão TCP com semáforo configurável
 * - Deduplicação de handshakes simultâneos (thundering herd prevention)
 * - Keepalive ativo para detecção e descarte de sockets mortos
 * - Timeouts rigorosos por tipo de operação
 * - Sanitização automática de logs e métricas de observabilidade sem vazamento de segredos
 */

import { Client, type ConnectConfig } from "ssh2";
import { sanitizeSecrets } from "./secret-sanitizer.ts";

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
  timeoutMs?: number;
  label?: string;
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

interface CircuitBreakerState {
  state: CircuitState;
  consecutiveNetworkFailures: number;
  lastFailureTime: number;
  openUntil: number;
  isAuthFailed: boolean;
}

interface ChannelQueueItem {
  resolve: () => void;
  reject: (err: Error) => void;
}

interface ManagedConnectionEntry {
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

interface EqsamSshGlobals {
  __eqsam_ssh_metrics?: SshManagerMetrics;
  __eqsam_ssh_registry?: Map<string, ManagedConnectionEntry>;
}

const sshGlobals = globalThis as unknown as EqsamSshGlobals;

const sshMetrics: SshManagerMetrics =
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

// Configurações e limites globais
const DEFAULT_READY_TIMEOUT_MS = 15000;
const DEFAULT_EXEC_TIMEOUT_MS = 18000;
const DEFAULT_MAX_CHANNELS = 6;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 25000;
const KEEPALIVE_INTERVAL_MS = 10000;
const KEEPALIVE_COUNT_MAX = 3;

/**
 * Registry de conexões ativas gerenciadas por chave única de servidor.
 * Mantido em globalThis para preservar conexões durante recarregamentos HMR em desenvolvimento.
 */
const connectionRegistry: Map<string, ManagedConnectionEntry> =
  sshGlobals.__eqsam_ssh_registry ||
  (sshGlobals.__eqsam_ssh_registry = new Map<string, ManagedConnectionEntry>());

export class SshConnectionManager {
  /**
   * Gera a chave única de conexão por servidor (nunca compartilha conexão entre servidores diferentes).
   */
  public static getServerKey(server: ServerEndpointConfig): string {
    const serverId = server.id || "default";
    const host = server.host || server.serverIp || "45.159.172.137";
    const port = server.sshPort || 30795;
    const user = server.sshUser || "root";
    return `${serverId}:${host}:${port}:${user}`;
  }

  /**
   * Obtém ou inicializa o registro de um servidor.
   */
  private static getOrCreateEntry(server: ServerEndpointConfig): ManagedConnectionEntry {
    const key = this.getServerKey(server);
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
   * Verifica o estado do Circuit Breaker para o servidor.
   */
  private static checkCircuit(entry: ManagedConnectionEntry): void {
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
  private static recordSuccess(entry: ManagedConnectionEntry): void {
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
  private static recordFailure(entry: ManagedConnectionEntry, error: unknown): void {
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
        console.warn(
          `[Circuit Breaker] ${entry.serverKey} atingiu ${entry.circuit.consecutiveNetworkFailures} falhas consecutivas. Estado: OPEN por ${CIRCUIT_COOLDOWN_MS / 1000}s.`
        );
      }
    }
  }

  /**
   * Verifica se o socket subjacente da conexão SSH ainda está vivo e utilizável.
   */
  public static isConnectionAlive(client: Client | null): boolean {
    if (!client) return false;
    try {
      const sock = (client as unknown as { _sock?: { destroyed?: boolean; connecting?: boolean; writable?: boolean } })._sock;
      if (!sock) return false;
      if (sock.destroyed || sock.connecting || !sock.writable) return false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtém a conexão SSH persistente ativa para o servidor, reconectando sob demanda de forma deduplicada.
   */
  public static async getConnection(server: ServerEndpointConfig): Promise<Client> {
    const entry = this.getOrCreateEntry(server);
    entry.lastUsedAt = Date.now();

    // 1. Verificar Circuit Breaker
    this.checkCircuit(entry);

    // 2. Conexão existente e saudável
    if (entry.client && this.isConnectionAlive(entry.client) && entry.state === "ready") {
      sshMetrics.sshConnectionsReused++;
      return entry.client;
    }

    // 3. Deduplicação de Handshake: se já há uma conexão em progresso, aguarda a mesma Promise
    if (entry.connectPromise) {
      return entry.connectPromise;
    }

    // 4. Iniciar novo handshake SSH de forma controlada
    entry.state = entry.client ? "reconnecting" : "connecting";
    const isReconnect = Boolean(entry.client);
    const startTime = Date.now();

    entry.connectPromise = (async () => {
      try {
        if (entry.client) {
          try {
            entry.client.end();
            entry.client.destroy();
          } catch {
            // Ignorar erro ao descartar socket antigo
          }
          entry.client = null;
        }

        const host = entry.server.host || entry.server.serverIp || "45.159.172.137";
        const port = entry.server.sshPort || 30795;
        const username = entry.server.sshUser || "root";
        const password = entry.server.sshPassword || entry.server.apiToken || "uvU8Ly3S6IaXW1fE";
        const privateKey = entry.server.sshKey;

        const newClient = new Client();

        await new Promise<void>((resolve, reject) => {
          let resolved = false;

          const opts: ConnectConfig = {
            host,
            port,
            username,
            readyTimeout: DEFAULT_READY_TIMEOUT_MS,
            keepaliveInterval: KEEPALIVE_INTERVAL_MS,
            keepaliveCountMax: KEEPALIVE_COUNT_MAX,
          };

          if (privateKey && privateKey.trim()) {
            opts.privateKey = privateKey.trim();
          } else {
            opts.password = password;
          }

          newClient
            .on("ready", () => {
              if (!resolved) {
                resolved = true;
                resolve();
              }
            })
            .on("error", (err: Error) => {
              entry.state = "failed";
              this.recordFailure(entry, err);
              if (!resolved) {
                resolved = true;
                reject(err);
              }
            })
            .on("close", () => {
              entry.state = "disconnected";
              entry.client = null;
              sshMetrics.sshConnectionsClosed++;
            })
            .on("end", () => {
              entry.state = "disconnected";
              entry.client = null;
              sshMetrics.sshConnectionsClosed++;
            });

          newClient.connect(opts);
        });

        const handshakeTime = Date.now() - startTime;
        console.log(`[SSH Pool] Conexão persistente estabelecida com ${entry.serverKey} em ${handshakeTime}ms`);

        if (isReconnect) {
          sshMetrics.sshReconnects++;
        }
        sshMetrics.sshConnectionsCreated++;
        sshMetrics.sshHandshakes++;

        entry.client = newClient;
        entry.state = "ready";
        this.recordSuccess(entry);

        return newClient;
      } catch (err: unknown) {
        entry.state = "failed";
        this.recordFailure(entry, err);
        throw err;
      } finally {
        entry.connectPromise = null;
      }
    })();

    return entry.connectPromise;
  }

  /**
   * Adquire um slot no semáforo de concorrência de canais da conexão.
   */
  private static async acquireChannel(entry: ManagedConnectionEntry, timeoutMs: number = 45000): Promise<void> {
    if (entry.activeChannels < entry.maxChannels) {
      entry.activeChannels++;
      sshMetrics.sshChannelsCreated++;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = entry.channelQueue.findIndex((item) => item.resolve === resolve);
        if (idx !== -1) entry.channelQueue.splice(idx, 1);
        reject(new Error(`[SSH Concurrency] Timeout aguardando canal disponível no servidor ${entry.serverKey}`));
      }, timeoutMs);

      entry.channelQueue.push({
        resolve: () => {
          clearTimeout(timeout);
          entry.activeChannels++;
          sshMetrics.sshChannelsCreated++;
          resolve();
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    });
  }

  /**
   * Libera um slot no semáforo de concorrência e desperta a próxima requisição na fila.
   */
  private static releaseChannel(entry: ManagedConnectionEntry): void {
    entry.activeChannels = Math.max(0, entry.activeChannels - 1);
    sshMetrics.sshChannelsReleased++;
    if (entry.channelQueue.length > 0) {
      const next = entry.channelQueue.shift();
      if (next) next.resolve();
    }
  }

  /**
   * Executa um comando no servidor Swarm utilizando a conexão persistente e multiplexada.
   */
  public static async execCommand(
    server: ServerEndpointConfig,
    command: string,
    options?: ExecOptions
  ): Promise<ExecResult> {
    const entry = this.getOrCreateEntry(server);
    const timeoutMs = options?.timeoutMs || DEFAULT_EXEC_TIMEOUT_MS;
    const label = options?.label || command.slice(0, 30);

    const maxRetries = 3;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // 1. Obter conexão viva (ou reconectar se caiu)
      const conn = await this.getConnection(server);

      // 2. Adquirir canal com controle de concorrência
      await this.acquireChannel(entry, Math.max(timeoutMs * 2, 45000));

      const tStart = Date.now();

      try {
        const result = await new Promise<ExecResult>((resolve, reject) => {
          let settled = false;
          let out = "";
          let timer: NodeJS.Timeout | null = null;

          timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              this.releaseChannel(entry);
              this.recordFailure(entry, new Error("Command timeout"));
              reject(new SshTimeoutError(command, timeoutMs));
            }
          }, timeoutMs);

          try {
            conn.exec(command, (err, stream) => {
              if (err) {
                if (!settled) {
                  settled = true;
                  if (timer) clearTimeout(timer);
                  this.releaseChannel(entry);
                  reject(err);
                }
                return;
              }

              stream
                .on("close", (code: number) => {
                  if (!settled) {
                    settled = true;
                    if (timer) clearTimeout(timer);
                    this.releaseChannel(entry);
                    const duration = Date.now() - tStart;
                    // Log estruturado de observabilidade sem expor comandos com secrets
                    const safeLabel = sanitizeSecrets(label);
                    console.log(
                      `[SSH Exec] ${entry.serverKey} | "${safeLabel}" executado em ${duration}ms (code: ${code}, canais ativos: ${entry.activeChannels})`
                    );
                    resolve({ code: code ?? 0, out: sanitizeSecrets(out) });
                  }
                })
                .on("data", (data: Buffer | string) => {
                  out += data;
                })
                .stderr.on("data", (data: Buffer | string) => {
                  out += data;
                });
            });
          } catch (execErr) {
            if (!settled) {
              settled = true;
              if (timer) clearTimeout(timer);
              this.releaseChannel(entry);
              reject(execErr);
            }
          }
        });

        this.recordSuccess(entry);
        return result;
      } catch (err: unknown) {
        lastError = err;
        const errMsg = String((err as any)?.message || err || "").toLowerCase();
        if (errMsg.includes("channel open failure") && attempt < maxRetries) {
          // OpenSSH sshd slot temporariamente saturado; aguarda 100ms e retenta com backoff
          await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
          continue;
        }
        this.recordFailure(entry, err);
        throw err;
      }
    }

    throw lastError;
  }

  /**
   * Envia um buffer via SFTP reutilizando a conexão gerenciada.
   */
  public static async uploadBuffer(
    server: ServerEndpointConfig,
    remotePath: string,
    buffer: Buffer
  ): Promise<void> {
    const entry = this.getOrCreateEntry(server);
    const conn = await this.getConnection(server);
    await this.acquireChannel(entry);

    return new Promise<void>((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) {
          this.releaseChannel(entry);
          return reject(err);
        }

        const writeStream = sftp.createWriteStream(remotePath);
        writeStream.on("close", () => {
          this.releaseChannel(entry);
          resolve();
        });
        writeStream.on("error", (wErr: any) => {
          this.releaseChannel(entry);
          reject(wErr);
        });
        writeStream.end(buffer);
      });
    });
  }

  /**
   * Retorna o status de observabilidade de todas as conexões e circuit breakers gerenciados.
   */
  public static getStatus(): Record<string, unknown> {
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
  public static getMetrics(): SshManagerMetrics {
    return { ...sshMetrics };
  }

  /**
   * Reseta os contadores para permitir medições controladas por cenário.
   */
  public static resetMetrics(): void {
    sshMetrics.sshConnectionsCreated = 0;
    sshMetrics.sshConnectionsReused = 0;
    sshMetrics.sshConnectionsClosed = 0;
    sshMetrics.sshReconnects = 0;
    sshMetrics.sshHandshakes = 0;
    sshMetrics.sshChannelsCreated = 0;
    sshMetrics.sshChannelsReleased = 0;
    sshMetrics.circuitTrips = 0;
  }

  /**
   * Força o encerramento seguro e descarte de todas as conexões ativas (ex: shutdown da aplicação).
   */
  public static async closeAll(): Promise<void> {
    for (const [key, entry] of connectionRegistry.entries()) {
      if (entry.client) {
        try {
          entry.client.end();
          entry.client.destroy();
        } catch {
          // Ignorar erro ao fechar socket no shutdown
        }
      }
      entry.state = "disconnected";
      entry.client = null;
      entry.activeChannels = 0;
    }
    connectionRegistry.clear();
    console.log("[SSH Pool] Todas as conexões persistentes foram encerradas.");
  }
}

/**
 * Interface abstrata do Transporte de orquestração Docker Swarm.
 * Permite que o SwarmManager utilize SSHTransport hoje, ou AgentTransport / InternalApiTransport futuramente.
 */
export interface SwarmTransport {
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  uploadBuffer?(remotePath: string, buffer: Buffer): Promise<void>;
  getStatus(): { state: ConnectionState; circuit: CircuitState; activeChannels: number };
}

/**
 * Implementação concreta de transporte Docker Swarm sobre SSH Connection Manager.
 */
export class SshSwarmTransport implements SwarmTransport {
  public readonly server: ServerEndpointConfig;

  constructor(server: ServerEndpointConfig) {
    this.server = server;
  }

  public async exec(command: string, options?: ExecOptions): Promise<ExecResult> {
    return SshConnectionManager.execCommand(this.server, command, options);
  }

  public async uploadBuffer(remotePath: string, buffer: Buffer): Promise<void> {
    return SshConnectionManager.uploadBuffer(this.server, remotePath, buffer);
  }

  public getStatus() {
    const key = SshConnectionManager.getServerKey(this.server);
    const all = SshConnectionManager.getStatus();
    const s = (all as any)[key] || { state: "disconnected", circuit: "CLOSED", activeChannels: 0 };
    return {
      state: s.state as ConnectionState,
      circuit: s.circuit as CircuitState,
      activeChannels: s.activeChannels as number,
    };
  }
}

// Limpeza graciosa ao encerrar o processo Node.js
if (typeof process !== "undefined" && process.on) {
  process.on("SIGTERM", () => SshConnectionManager.closeAll());
  process.on("SIGINT", () => SshConnectionManager.closeAll());
}
