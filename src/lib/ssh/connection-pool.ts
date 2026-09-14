import { Client, type ConnectConfig } from "ssh2";
import {
  type ServerEndpointConfig,
  DEFAULT_READY_TIMEOUT_MS,
  KEEPALIVE_INTERVAL_MS,
  KEEPALIVE_COUNT_MAX,
} from "./types.ts";
import { connectionRegistry, getOrCreateEntry, sshMetrics } from "./state.ts";
import { checkCircuit, recordSuccess, recordFailure } from "./circuit-breaker.ts";

/**
 * Verifica se o socket subjacente da conexão SSH ainda está vivo e utilizável.
 */
export function isConnectionAlive(client: Client | null): boolean {
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
export async function getConnection(server: ServerEndpointConfig): Promise<Client> {
  const entry = getOrCreateEntry(server);
  entry.lastUsedAt = Date.now();

  // 1. Verificar Circuit Breaker
  checkCircuit(entry);

  // 2. Conexão existente e saudável
  if (entry.client && isConnectionAlive(entry.client) && entry.state === "ready") {
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
            recordFailure(entry, err);
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
      recordSuccess(entry);

      return newClient;
    } catch (err: unknown) {
      entry.state = "failed";
      recordFailure(entry, err);
      throw err;
    } finally {
      entry.connectPromise = null;
    }
  })();

  return entry.connectPromise;
}

/**
 * Força o encerramento seguro e descarte de todas as conexões ativas (ex: shutdown da aplicação).
 */
export async function closeAll(): Promise<void> {
  for (const [, entry] of connectionRegistry.entries()) {
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
