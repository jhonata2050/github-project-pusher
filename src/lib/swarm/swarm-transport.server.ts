import type { ClusterServerConfig } from "../cloud-apps.server";
import { SshConnectionManager } from "../ssh-connection-manager.server";
import { sanitizeSecrets } from "../secret-sanitizer";

export interface SwarmExecResult {
  code: number;
  out: string;
}

/**
 * Executa comandos SSH sobre a conexão com timeout controlado e sanitização de segredos na saída.
 */
export async function execSshCommand(
  conn: any,
  cmd: string,
  timeoutMs: number = 20000
): Promise<SwarmExecResult> {
  return new Promise((resolve, reject) => {
    let out = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`[SSH Timeout] Comando excedeu ${timeoutMs}ms: "${cmd.slice(0, 50)}..."`));
      }
    }, timeoutMs);

    conn.exec(cmd, (err: any, stream: any) => {
      if (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
        return;
      }
      stream
        .on("close", (code: number) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve({ code: code ?? 0, out: sanitizeSecrets(out) });
          }
        })
        .on("data", (d: any) => (out += d))
        .stderr.on("data", (d: any) => (out += d));
    });
  });
}

/**
 * Obtém conexão persistente do pool gerenciado pelo SshConnectionManager.
 * Intercepta chamadas a conn.end() para manter o socket aberto e compartilhado entre requisições.
 */
export async function getSshConnection(server: ClusterServerConfig): Promise<any> {
  const rawConn = await SshConnectionManager.getConnection(server);
  if (!(rawConn as any).__end_intercepted) {
    (rawConn as any).__end_intercepted = true;
    (rawConn as any)._raw_end = rawConn.end.bind(rawConn);
    rawConn.end = () => {
      // No-op gracioso: a conexão é mantida ativa no pool do SshConnectionManager
    };
  }
  return rawConn;
}
