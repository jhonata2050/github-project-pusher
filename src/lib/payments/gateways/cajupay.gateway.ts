import type { GatewaySessionParams, PaymentResult } from "../types";
import { recordTransaction } from "../transactions.server";
import { publicUrl } from "../url";
import { getCajuPayCredentials, getCajuPayHeaders, readCajuPayError } from "../../cajupay.server";

/**
 * CajuPay Pix and Boleto gateway adapter.
 */
export async function createCajuPaySession(params: GatewaySessionParams): Promise<PaymentResult> {
  const { invoice, cfg, customer, ref, description, cents, amount, base, method } = params;
  const ownerId = invoice.user_id as string;

  const credentials = getCajuPayCredentials(cfg);
  if (!credentials.publicKey || !credentials.secretKey) {
    throw new Error("CajuPay: informe a Public Key e a Secret Key.");
  }
  if (method === "credit_card") {
    throw new Error("CajuPay: cartão exige o checkout SDK e não está disponível neste fluxo.");
  }

  const isPix = method === "pix";
  const endpoint = isPix ? "/api/payments/pix" : "/api/payments/boleto";
  const partnerCheckoutUrl = `${publicUrl()}/invoices/${invoice.id}`;
  const payload = isPix
    ? {
        amount_cents: cents,
        currency: "BRL",
        description,
        product_ref: ref,
        customer_ref: ownerId,
        partner_checkout_url: partnerCheckoutUrl,
        consumer: {
          name: customer.name,
          email: customer.email,
          document: customer.taxId,
          phone: `+55${customer.phone.replace(/^55/, "")}`,
        },
      }
    : {
        value_cents: cents,
        comment: description,
        customer: {
          name: customer.name,
          tax_id: customer.taxId,
          email: customer.email,
        },
      };

  const res = await fetch(`${credentials.baseUrl}${endpoint}`, {
    method: "POST",
    headers: getCajuPayHeaders(credentials, `invoice-${invoice.id}-${method}-v3`),
    body: JSON.stringify(payload),
  });

  const json: any = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`CajuPay: ${await readCajuPayError(new Response(JSON.stringify(json), { status: res.status }))}`);
  }

  const transactionId = await recordTransaction({
    userId: ownerId,
    invoiceId: invoice.id,
    amount,
    gateway: base.gateway,
    reference: json.payment_id || json.transaction_id || ref,
    method,
    metadata: { pix_key: json.pix_key, digitableLine: json.digitable_line },
  });

  if (isPix) {
    return {
      ...base,
      transactionId,
      pixCode: json.pix_copy_paste,
      qrCodeUrl: json.pix_qr_code,
    };
  }
  return { ...base, transactionId, checkoutUrl: json.boleto_url || json.pdf_url || json.url, digitableLine: json.digitable_line };
}
