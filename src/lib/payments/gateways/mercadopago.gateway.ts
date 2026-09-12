import type { GatewaySessionParams, PaymentResult } from "../types";
import { recordTransaction } from "../transactions.server";
import { publicUrl } from "../url";

/**
 * Mercado Pago payment gateway adapter (Checkout Pro, Pix & Boleto).
 */
export async function createMercadoPagoSession(params: GatewaySessionParams): Promise<PaymentResult> {
  const { invoice, cfg, customer, ref, description, amount, returnUrl, base, method } = params;
  const ownerId = invoice.user_id as string;

  const auth = {
    Authorization: `Bearer ${cfg["mercadopago_access_token"]}`,
    "Content-Type": "application/json",
  };

  // Cartão → Checkout Pro (preferência)
  if (method === "credit_card") {
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        external_reference: ref,
        items: [{ title: description, quantity: 1, unit_price: amount, currency_id: "BRL" }],
        payer: { email: customer.email, name: customer.name },
        payment_methods: { excluded_payment_types: [{ id: "ticket" }] },
        back_urls: { success: `${returnUrl}?success=true`, pending: returnUrl, failure: returnUrl },
        notification_url: `${publicUrl()}/api/public/webhooks/mercadopago`,
      }),
    });
    const json: any = await res.json().catch(() => null);
    const url = json?.init_point || json?.sandbox_init_point;
    if (!res.ok || !url) throw new Error(`Mercado Pago: ${json?.message || res.status}`);
    const transactionId = await recordTransaction({
      userId: ownerId,
      invoiceId: invoice.id,
      amount,
      gateway: base.gateway,
      reference: json.id,
      method,
      metadata: { checkoutUrl: url },
    });
    return { ...base, transactionId, checkoutUrl: url };
  }

  // Pix e boleto → pagamento direto
  const [firstName, ...rest] = customer.name.split(" ");
  const res = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: { ...auth, "X-Idempotency-Key": `${ref}-${method}-${Date.now()}` },
    body: JSON.stringify({
      transaction_amount: amount,
      description,
      external_reference: ref,
      payment_method_id: method === "pix" ? "pix" : "bolbradesco",
      notification_url: `${publicUrl()}/api/public/webhooks/mercadopago`,
      payer: {
        email: customer.email,
        first_name: firstName,
        last_name: rest.join(" ") || firstName,
        identification: { type: customer.taxId.length > 11 ? "CNPJ" : "CPF", number: customer.taxId },
      },
    }),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json?.id) throw new Error(`Mercado Pago: ${json?.message || res.status}`);

  const pixData = json?.point_of_interaction?.transaction_data;
  const boletoUrl = json?.transaction_details?.external_resource_url;
  const transactionId = await recordTransaction({
    userId: ownerId,
    invoiceId: invoice.id,
    amount,
    gateway: base.gateway,
    reference: String(json.id),
    method,
    metadata: { checkoutUrl: boletoUrl },
  });

  if (method === "pix") {
    return {
      ...base,
      transactionId,
      pixCode: pixData?.qr_code,
      qrCodeUrl: pixData?.qr_code_base64
        ? `data:image/png;base64,${pixData.qr_code_base64}`
        : undefined,
    };
  }
  return { ...base, transactionId, checkoutUrl: boletoUrl };
}
