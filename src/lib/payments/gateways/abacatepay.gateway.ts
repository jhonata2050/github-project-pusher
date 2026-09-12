import type { GatewaySessionParams, PaymentResult } from "../types";
import { recordTransaction } from "../transactions.server";

/**
 * AbacatePay Pix Checkout adapter.
 */
export async function createAbacatePaySession(params: GatewaySessionParams): Promise<PaymentResult> {
  const { invoice, cfg, customer, ref, description, cents, returnUrl, base, method } = params;
  const ownerId = invoice.user_id as string;
  const amount = Number(invoice.total_amount);

  const res = await fetch("https://api.abacatepay.com/v1/billing/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg["abacatepay_api_key"]}`,
    },
    body: JSON.stringify({
      frequency: "ONE_TIME",
      methods: ["PIX"],
      products: [
        { externalId: ref, name: description, quantity: 1, price: cents },
      ],
      returnUrl,
      completionUrl: `${returnUrl}?success=true`,
      customer: { name: customer.name, email: customer.email, taxId: customer.taxId, cellphone: customer.phone },
    }),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.url) {
    throw new Error(`AbacatePay: ${json?.error || res.status}`);
  }
  const transactionId = await recordTransaction({
    userId: ownerId,
    invoiceId: invoice.id,
    amount,
    gateway: base.gateway,
    reference: json.data.id,
    method,
    metadata: { checkoutUrl: json.data.url },
  });
  return { ...base, transactionId, checkoutUrl: json.data.url };
}
