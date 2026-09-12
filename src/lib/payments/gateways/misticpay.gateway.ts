import type { GatewaySessionParams, PaymentResult } from "../types";
import { recordTransaction } from "../transactions.server";
import { publicUrl } from "../url";

/**
 * MisticPay Pix gateway adapter.
 */
export async function createMisticPaySession(params: GatewaySessionParams): Promise<PaymentResult> {
  const { invoice, cfg, customer, ref, description, amount, base } = params;
  const ownerId = invoice.user_id as string;

  const apiKey = cfg["misticpay_api_key"];
  if (!apiKey) {
    throw new Error("MisticPay: informe a API Key / Token em Configurações > Financeiro.");
  }
  const baseUrl = (cfg["misticpay_base_url"] || "https://api.misticpay.com").replace(/\/$/, "");
  const clientId = cfg["misticpay_client_id"];
  const clientSecret = cfg["misticpay_client_secret"];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-API-Key": apiKey,
  };
  if (clientId) headers["X-Client-ID"] = clientId;
  if (clientSecret) headers["X-Client-Secret"] = clientSecret;

  const payload = {
    amount,
    value: amount,
    description,
    external_reference: ref,
    reference_id: ref,
    postback_url: `${publicUrl()}/api/public/webhooks/misticpay`,
    webhook_url: `${publicUrl()}/api/public/webhooks/misticpay`,
    payer: {
      name: customer.name,
      email: customer.email,
      document: customer.taxId || undefined,
    },
  };

  const candidates = [
    `${baseUrl}/api/pix/cashin`,
    `${baseUrl}/api/pix`,
    `${baseUrl}/api/transactions`,
    `${baseUrl}/v1/pix`,
    `${baseUrl}/api/payments`,
  ];

  let res: Response | null = null;
  let json: any = null;

  for (const endpoint of candidates) {
    const attempt = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!attempt) continue;
    const attemptJson = await attempt.json().catch(() => null);
    if (attempt.status === 404) continue;

    res = attempt;
    json = attemptJson;
    break;
  }

  if (!res || !res.ok) {
    const errDetail = json?.message || json?.error || json?.detail || (res ? `HTTP ${res.status}` : "Falha de conexão");
    throw new Error(`MisticPay: ${errDetail}`);
  }

  const pixCode = json.pix_code || json.qr_code || json.pix_copy_paste || json.emv || json.code;
  const qrCodeUrl = json.qr_code_url || json.qr_code_image || json.qr_code_base64 || json.image_url;
  const reference = json.transaction_id || json.id || json.data?.id || ref;

  const transactionId = await recordTransaction({
    userId: ownerId,
    invoiceId: invoice.id,
    amount,
    gateway: base.gateway,
    reference,
    method: "pix",
    metadata: { ...json },
  });

  return {
    ...base,
    transactionId,
    pixCode,
    qrCodeUrl,
  };
}
