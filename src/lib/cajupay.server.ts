export type CajuPayCredentials = {
  baseUrl: string;
  publicKey: string;
  secretKey: string;
};

export function getCajuPayCredentials(settings: Record<string, string>): CajuPayCredentials {
  const configuredBaseUrl = settings["cajupay_base_url"]?.trim();
  const baseUrl = configuredBaseUrl?.startsWith("https://")
    ? configuredBaseUrl
    : "https://api.cajupay.com.br";
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    publicKey: settings["cajupay_client_id"] || "",
    secretKey: settings["cajupay_client_secret"] || "",
  };
}

export function getCajuPayHeaders(credentials: CajuPayCredentials, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": credentials.publicKey,
    "X-API-Secret": credentials.secretKey,
  };

  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return headers;
}

export async function readCajuPayError(response: Response) {
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  const message = body?.["user_message"] || body?.["message"] || body?.["error"];
  const field = body?.["field"] || body?.["parameter"];
  const suffix = typeof field === "string" ? ` (${field})` : "";
  const details = body
    ? Object.entries(body)
        .filter(([key, value]) => !["message", "user_message", "error"].includes(key) && typeof value === "string")
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
    : "";
  const detailSuffix = details ? ` — ${details}` : "";
  return typeof message === "string" ? `${message}${suffix}${detailSuffix}` : `HTTP ${response.status}`;
}