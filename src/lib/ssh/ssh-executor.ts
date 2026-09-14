import {
  type ServerEndpointConfig,
  type ExecOptions,
  type ExecResult,
  SshTimeoutError,
  DEFAULT_EXEC_TIMEOUT_MS,
} from "./types.ts";
import { getOrCreateEntry } from "./state.ts";
import { getConnection } from "./connection-pool.ts";
import { acquireChannel, releaseChannel } from "./channel-pool.ts";
import { recordSuccess, recordFailure } from "./circuit-breaker.ts";
import { sanitizeSecrets } from "../secret-sanitizer.ts";

/**
 * Executa um comando no servidor Swarm utilizando a conexão persistente e multiplexada.
 */
export async function execCommand(
  server: ServerEndpointConfig,
  command: string,
  options?: ExecOptions
): Promise<ExecResult> {
  const entry = getOrCreateEntry(server);
  const timeoutMs = options?.timeoutMs || DEFAULT_EXEC_TIMEOUT_MS;
  const label = options?.label || command.slice(0, 30);

  const maxRetries = 3;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // 1. Obter conexão viva (ou reconectar se caiu)
    const conn = await getConnection(server);

    // 2. Adquirir canal com controle de concorrência
    await acquireChannel(entry, Math.max(timeoutMs * 2, 45000));

    const tStart = Date.now();

    try {
      const result = await new Promise<ExecResult>((resolve, reject) => {
        let settled = false;
        let out = "";
        let timer: NodeJS.Timeout | null = null;

        timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            releaseChannel(entry);
            recordFailure(entry, new Error("Command timeout"));
            reject(new SshTimeoutError(command, timeoutMs));
          }
        }, timeoutMs);

        try {
          conn.exec(command, (err, stream) => {
            if (err) {
              if (!settled) {
                settled = true;
                if (timer) clearTimeout(timer);
                releaseChannel(entry);
                reject(err);
              }
              return;
            }

            stream
              .on("close", (code: number) => {
                if (!settled) {
                  settled = true;
                  if (timer) clearTimeout(timer);
                  releaseChannel(entry);
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
            releaseChannel(entry);
            reject(execErr);
          }
        }
      });

      recordSuccess(entry);
      return result;
    } catch (err: unknown) {
      lastError = err;
      const errMsg = String((err as any)?.message || err || "").toLowerCase();
      if (errMsg.includes("channel open failure") && attempt < maxRetries) {
        // OpenSSH sshd slot temporariamente saturado; aguarda 100ms e retenta com backoff
        await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
        continue;
      }
      recordFailure(entry, err);
      throw err;
    }
  }

  throw lastError;
}

/**
 * Envia um buffer via SFTP reutilizando a conexão gerenciada.
 */
export async function uploadBuffer(
  server: ServerEndpointConfig,
  remotePath: string,
  buffer: Buffer
): Promise<void> {
  const entry = getOrCreateEntry(server);
  const conn = await getConnection(server);
  await acquireChannel(entry);

  return new Promise<void>((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) {
        releaseChannel(entry);
        return reject(err);
      }

      const writeStream = sftp.createWriteStream(remotePath);
      writeStream.on("close", () => {
        releaseChannel(entry);
        resolve();
      });
      writeStream.on("error", (wErr: any) => {
        releaseChannel(entry);
        reject(wErr);
      });
      writeStream.end(buffer);
    });
  });
}
