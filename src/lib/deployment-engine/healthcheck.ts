import { HealthcheckConfig } from "./types";
import net from "net";

export interface HealthcheckResult {
  isHealthy: boolean;
  type: string;
  statusCode?: number;
  error?: string;
  durationMs: number;
  attempts: number;
  timestamp: string;
}

export class HealthcheckManager {
  private static DEFAULT_STATUSES = [200, 201, 202, 204, 301, 302, 307, 308];

  /**
   * Executa a rotina completa de healthcheck com retries e startPeriod
   */
  public static async check(
    targetUrlOrHost: string,
    config: HealthcheckConfig
  ): Promise<HealthcheckResult> {
    const startTime = Date.now();
    const retries = config.retries || 5;
    const intervalMs = (config.intervalSeconds || 3) * 1000;
    const timeoutMs = (config.timeoutSeconds || 5) * 1000;
    const startPeriodMs = (config.startPeriodSeconds || 2) * 1000;

    // Aguardar período de inicialização (startPeriod) antes do primeiro probe
    if (startPeriodMs > 0) {
      await new Promise((r) => setTimeout(r, Math.min(startPeriodMs, 3000)));
    }

    let lastError: string | undefined;
    let lastStatusCode: number | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (config.type === "http") {
          const res = await this.probeHttp(targetUrlOrHost, config.path || "/", timeoutMs);
          lastStatusCode = res.status;
          const allowed = config.expectedStatus || this.DEFAULT_STATUSES;

          if (allowed.includes(res.status)) {
            return {
              isHealthy: true,
              type: "http",
              statusCode: res.status,
              durationMs: Date.now() - startTime,
              attempts: attempt,
              timestamp: new Date().toISOString(),
            };
          } else {
            lastError = `HTTP Status inesperado: ${res.status} (esperado: ${allowed.join(", ")})`;
          }
        } else if (config.type === "tcp") {
          const port = config.port || 80;
          await this.probeTcp(targetUrlOrHost, port, timeoutMs);
          return {
            isHealthy: true,
            type: "tcp",
            durationMs: Date.now() - startTime,
            attempts: attempt,
            timestamp: new Date().toISOString(),
          };
        } else if (config.type === "process" || config.type === "command") {
          // Processo/Container iniciado e respondendo
          return {
            isHealthy: true,
            type: config.type,
            durationMs: Date.now() - startTime,
            attempts: attempt,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (err: any) {
        lastError = err.message || "Falha de conexão";
      }

      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    }

    return {
      isHealthy: false,
      type: config.type,
      statusCode: lastStatusCode,
      error: lastError || "Tempo limite de healthcheck excedido",
      durationMs: Date.now() - startTime,
      attempts: retries,
      timestamp: new Date().toISOString(),
    };
  }

  private static async probeHttp(
    baseUrl: string,
    path: string,
    timeoutMs: number
  ): Promise<{ status: number }> {
    const cleanBase = baseUrl.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const fullUrl = `${cleanBase}${cleanPath}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(fullUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "Eqsam-Healthcheck-Probe/1.0",
          Accept: "*/*",
        },
      });
      return { status: response.status };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static async probeTcp(host: string, port: number, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const cleanHost = host.replace(/^https?:\/\//, "").split(":")[0];
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.on("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error(`Timeout de conexão TCP em ${cleanHost}:${port}`));
      });

      socket.on("error", (err) => {
        socket.destroy();
        reject(err);
      });

      socket.connect(port, cleanHost);
    });
  }
}
