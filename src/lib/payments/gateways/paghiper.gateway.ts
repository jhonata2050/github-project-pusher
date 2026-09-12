import type { GatewaySessionParams, PaymentResult } from "../types";
import { recordTransaction } from "../transactions.server";
import { publicUrl } from "../url";

/**
 * PagHiper Pix and Boleto gateway adapter.
 */
export async function createPagHiperSession(params: GatewaySessionParams): Promise<PaymentResult> {
  const { invoice, cfg, customer, ref, description, cents, amount, base, method } = params;
  const ownerId = invoice.user_id as string;

  // PagHiper exige o par apiKey + token, com endpoints distintos por meio.
  const endpoint =
    method === "pix"
      ? "https://pix.paghiper.com/invoice/create/"
      : "https://api.paghiper.com/transaction/create/";

  const payload = {
    apiKey: cfg["paghiper_api_key"],
    order_id: String(ref).slice(0, 30),
    payer_email: customer.email,
    payer_name: customer.name,
    payer_cpf_cnpj: customer.taxId,
    payer_phone: customer.phone,
    notification_url: `${publicUrl()}/api/public/webhooks/paghiper`,
    days_due_date: "3",
    fixed_description: true,
    items: [{ description, quantity: "1", item_id: "1", price_cents: String(cents) }],
    type_bank_slip: "boletoA4",
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": cfg["paghiper_api_key"] ?? "",
      token: cfg["paghiper_token"] ?? "",
    },
    body: JSON.stringify({ ...payload, token: cfg["paghiper_token"] }),
  });
  const json: any = await res.json().catch(() => null);

  if (method === "pix") {
    const r = json?.pix_create_request;
    if (r?.result !== "success") throw new Error(`PagHiper: ${r?.response_message || res.status}`);
    const transactionId = await recordTransaction({
      userId: ownerId,
      invoiceId: invoice.id,
      amount,
      gateway: base.gateway,
      reference: r.transaction_id,
      method: "pix",
    });
    return {
      ...base,
      transactionId,
      pixCode: r.pix_code?.emv,
      qrCodeUrl: r.pix_code?.qrcode_image_url,
    };
  }

  const r = json?.create_request;
  if (r?.result !== "success") throw new Error(`PagHiper: ${r?.response_message || res.status}`);
  const slip = r.bank_slip?.url_slip_pdf || r.bank_slip?.url_slip;
  const transactionId = await recordTransaction({
    userId: ownerId,
    invoiceId: invoice.id,
    amount,
    gateway: base.gateway,
    reference: r.transaction_id,
    method: "boleto",
    metadata: { checkoutUrl: slip, digitableLine: r.bank_slip?.digitable_line },
  });
  return { ...base, transactionId, checkoutUrl: slip, digitableLine: r.bank_slip?.digitable_line };
}
