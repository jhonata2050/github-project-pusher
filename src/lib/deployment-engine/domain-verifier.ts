export interface DomainVerificationResult {
  isValid: boolean;
  fqdn: string;
  statusCode?: number;
  tlsValid?: boolean;
  error?: string;
  isProxyError?: boolean;
  responseTimeMs: number;
  timestamp: string;
}

export class DomainVerificationManager {
  private static DEFAULT_ALLOWED_STATUSES = [200, 201, 202, 204, 301, 302, 307, 308, 401, 403];

  /**
   * Verifica se o domínio público está ativo, roteado pelo Traefik e respondendo sem 502/503
   */
  public static async verifyDomain(
    fqdn: string,
    allowedStatuses: number[] = this.DEFAULT_ALLOWED_STATUSES,
    timeoutMs: number = 8000
  ): Promise<DomainVerificationResult> {
    const startTime = Date.now();
    const cleanFqdn = fqdn.startsWith("http://") || fqdn.startsWith("https://") ? fqdn : `https://${fqdn}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(cleanFqdn, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "Eqsam-Domain-Verifier/1.0",
          Accept: "*/*",
        },
      });

      const statusCode = response.status;
      const responseTimeMs = Date.now() - startTime;

      // 502 Bad Gateway ou 503/504 indicam que o Traefik não conseguiu alcançar o container
      if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
        return {
          isValid: false,
          fqdn: cleanFqdn,
          statusCode,
          tlsValid: true,
          isProxyError: true,
          error: `O proxy reverso Traefik retornou status ${statusCode}. O container não está escutando na porta correta ou em 0.0.0.0.`,
          responseTimeMs,
          timestamp: new Date().toISOString(),
        };
      }

      const isAllowed = allowedStatuses.includes(statusCode);

      return {
        isValid: isAllowed,
        fqdn: cleanFqdn,
        statusCode,
        tlsValid: cleanFqdn.startsWith("https://"),
        isProxyError: false,
        error: isAllowed ? undefined : `Status HTTP inesperado: ${statusCode}`,
        responseTimeMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const responseTimeMs = Date.now() - startTime;
      let errorMsg = err.message || "Falha ao conectar no domínio";

      if (err.name === "AbortError") {
        errorMsg = `Tempo limite esgotado (${timeoutMs / 1000}s) ao aguardar resposta do domínio ${cleanFqdn}.`;
      }

      return {
        isValid: false,
        fqdn: cleanFqdn,
        error: errorMsg,
        isProxyError: true,
        responseTimeMs,
        timestamp: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
