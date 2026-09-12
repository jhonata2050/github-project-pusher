import type { GatewaySessionParams, PaymentResult } from "../types";
import { recordTransaction } from "../transactions.server";

/**
 * Woovi (OpenPix) Pix payment gateway adapter.
 */
export async function createWooviSession(params: GatewaySessionParams): Promise<PaymentResult> {
  const { invoice, cfg, customer, ref, description, cents, amount, base } = params;
  const ownerId = invoice.user_id as string;
  const appId = (cfg["woovi_app_id"] || "").trim();
  
  // Validação extra de segurança para evitar 401 óbvios
  if (!appId || appId.includes("placeholder") || appId.length < 5) {
    throw new Error("Woovi: AppID não configurado ou inválido. Verifique em Admin > Financeiro.");
  }

  const res = await fetch("https://api.woovi.com/api/openpix/v1/charge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: appId,
    },
    body: JSON.stringify({
      correlationID: `invoice-${ref}`,
      value: cents,
      comment: description,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: `55${customer.phone}`,
        taxID: customer.taxId,
      },
    }),
  });
  const json: any = await res.json().catch(() => null);
  const charge = json?.charge;
  if (!res.ok || !charge) {
    const errorMsg = json?.error || (res.status === 401 ? "AppID inválido ou não autorizado" : res.statusText);
    throw new Error(`Woovi: ${errorMsg}`);
  }
  const transactionId = await recordTransaction({
    userId: ownerId,
    invoiceId: invoice.id,
    amount,
    gateway: base.gateway,
    reference: charge.correlationID || charge.identifier,
    method: "pix",
    metadata: { checkoutUrl: charge.paymentLinkUrl },
  });
  return {
    ...base,
    transactionId,
    pixCode: charge.brCode,
    qrCodeUrl: charge.qrCodeImage,
    checkoutUrl: charge.paymentLinkUrl,
  };
}
