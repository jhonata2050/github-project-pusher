import type { GatewaySessionParams, PaymentResult } from "../types";
import { recordTransaction } from "../transactions.server";

/**
 * Stripe Checkout Sessions adapter (Credit Card & Boleto).
 */
export async function createStripeSession(params: GatewaySessionParams): Promise<PaymentResult> {
  const { invoice, cfg, customer, ref, description, cents, returnUrl, base, method } = params;
  const ownerId = invoice.user_id as string;
  const amount = Number(invoice.total_amount);

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", `${returnUrl}?success=true`);
  body.set("cancel_url", returnUrl);
  body.set("client_reference_id", ref);
  body.set("customer_email", customer.email);
  body.set("payment_method_types[0]", method === "boleto" ? "boleto" : "card");
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "brl");
  body.set("line_items[0][price_data][unit_amount]", String(cents));
  body.set("line_items[0][price_data][product_data][name]", description);
  body.set("metadata[invoice_id]", ref);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg["stripe_secret_key"]}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json?.url) throw new Error(`Stripe: ${json?.error?.message || res.status}`);
  const transactionId = await recordTransaction({
    userId: ownerId,
    invoiceId: invoice.id,
    amount,
    gateway: base.gateway,
    reference: json.id,
    method,
    metadata: { checkoutUrl: json.url },
  });
  return { ...base, transactionId, checkoutUrl: json.url };
}
