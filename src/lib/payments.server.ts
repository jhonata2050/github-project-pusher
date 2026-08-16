import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ALL_GATEWAY_SETTING_KEYS, gatewayById, type PaymentMethod } from "./gateways";

type PaymentResult = {
  transactionId?: string | undefined;
  method: PaymentMethod;
  gateway: string;
  amount: number;
  checkoutUrl?: string | undefined;
  pixCode?: string | undefined;
  qrCodeUrl?: string | undefined;
};

function publicUrl() {
  return process.env["PUBLIC_URL"] || "http://localhost:8080";
}

function onlyDigits(v?: string | null) {
  return (v || "").replace(/\D/g, "");
}

async function recordTransaction(args: {
  userId: string;
  invoiceId: string;
  amount: number;
  gateway: string;
  reference: string;
  method: PaymentMethod;
  metadata?: Record<string, unknown>;
}) {
  const { data } = await supabaseAdmin
    .from("transactions")
    .insert({
      user_id: args.userId,
      invoice_id: args.invoiceId,
      amount: args.amount,
      gateway: args.gateway,
      gateway_reference: args.reference,
      status: "pending",
      metadata: { method: args.method, ...(args.metadata || {}) },
    })
    .select()
    .single();
  return data?.id as string | undefined;
}

export async function createPaymentSession(
  userId: string,
  data: { invoiceId: string; method: PaymentMethod; gateway: string },
): Promise<PaymentResult> {
  const def = gatewayById(data.gateway);
  if (!def) throw new Error(`Gateway desconhecido: ${data.gateway}`);
  if (!def.methods.includes(data.method)) {
    throw new Error(`${def.name} não suporta esse meio de pagamento.`);
  }

  const { data: invoice, error: iError } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("id", data.invoiceId)
    .eq("user_id", userId)
    .single();

  if (iError || !invoice) throw new Error("Fatura não encontrada");
  if (invoice.status === "paid") throw new Error("Fatura já está paga");

  const { data: settings } = await supabaseAdmin
    .from("system_settings")
    .select("*")
    .in("key", ALL_GATEWAY_SETTING_KEYS);

  const cfg: Record<string, string> = Object.fromEntries(
    (settings || []).map((s: any) => [s.key, typeof s.value === "string" ? s.value : String(s.value ?? "")]),
  );

  for (const key of def.required) {
    if (!cfg[key] || cfg[key].includes("placeholder")) {
      throw new Error(`${def.name} não está configurado. Informe as credenciais em Admin > Financeiro.`);
    }
  }

  const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).single();

  const amount = Number(invoice.total_amount);
  const cents = Math.round(amount * 100);
  const ref = invoice.id;
  const description = `Fatura #${String(invoice.id).slice(0, 8)}`;
  const customer = {
    name: profile?.full_name || "Cliente HostPanel",
    email: profile?.email || "cliente@exemplo.com",
    taxId: onlyDigits(profile?.tax_id) || "00000000191",
    phone: onlyDigits(profile?.phone) || "11999999999",
  };
  const returnUrl = `${publicUrl()}/invoices/${invoice.id}`;

  const base = { method: data.method, gateway: def.id, amount } as const;

  switch (def.id) {
    // ------------------------------------------------------------ AbacatePay
    case "abacatepay": {
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
        userId, invoiceId: invoice.id, amount, gateway: def.id, reference: json.data.id,
        method: data.method, metadata: { checkoutUrl: json.data.url },
      });
      return { ...base, transactionId, checkoutUrl: json.data.url };
    }

    // ---------------------------------------------------------------- Stripe
    case "stripe": {
      const body = new URLSearchParams();
      body.set("mode", "payment");
      body.set("success_url", `${returnUrl}?success=true`);
      body.set("cancel_url", returnUrl);
      body.set("client_reference_id", ref);
      body.set("customer_email", customer.email);
      body.set("payment_method_types[0]", data.method === "boleto" ? "boleto" : "card");
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
        userId, invoiceId: invoice.id, amount, gateway: def.id, reference: json.id,
        method: data.method, metadata: { checkoutUrl: json.url },
      });
      return { ...base, transactionId, checkoutUrl: json.url };
    }

    // ---------------------------------------------------------- Mercado Pago
    case "mercadopago": {
      const auth = {
        Authorization: `Bearer ${cfg["mercadopago_access_token"]}`,
        "Content-Type": "application/json",
      };

      // Cartão → Checkout Pro (preferência)
      if (data.method === "credit_card") {
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
          userId, invoiceId: invoice.id, amount, gateway: def.id, reference: json.id,
          method: data.method, metadata: { checkoutUrl: url },
        });
        return { ...base, transactionId, checkoutUrl: url };
      }

      // Pix e boleto → pagamento direto
      const [firstName, ...rest] = customer.name.split(" ");
      const res = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: { ...auth, "X-Idempotency-Key": `${ref}-${data.method}-${Date.now()}` },
        body: JSON.stringify({
          transaction_amount: amount,
          description,
          external_reference: ref,
          payment_method_id: data.method === "pix" ? "pix" : "bolbradesco",
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
        userId, invoiceId: invoice.id, amount, gateway: def.id, reference: String(json.id),
        method: data.method, metadata: { checkoutUrl: boletoUrl },
      });

      if (data.method === "pix") {
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

    // ----------------------------------------------------------- Woovi/OpenPix
    case "woovi": {
      const res = await fetch("https://api.woovi.com/api/openpix/v1/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: cfg["woovi_app_id"] ?? "" },
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
      if (!res.ok || !charge) throw new Error(`Woovi: ${json?.error || res.status}`);
      const transactionId = await recordTransaction({
        userId, invoiceId: invoice.id, amount, gateway: def.id,
        reference: charge.correlationID || charge.identifier,
        method: "pix", metadata: { checkoutUrl: charge.paymentLinkUrl },
      });
      return {
        ...base,
        transactionId,
        pixCode: charge.brCode,
        qrCodeUrl: charge.qrCodeImage,
        checkoutUrl: charge.paymentLinkUrl,
      };
    }

    // -------------------------------------------------------------- PagHiper
    case "paghiper": {
      // PagHiper exige o par apiKey + token, com endpoints distintos por meio.
      const endpoint =
        data.method === "pix"
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

      if (data.method === "pix") {
        const r = json?.pix_create_request;
        if (r?.result !== "success") throw new Error(`PagHiper: ${r?.response_message || res.status}`);
        const transactionId = await recordTransaction({
          userId, invoiceId: invoice.id, amount, gateway: def.id, reference: r.transaction_id,
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
        userId, invoiceId: invoice.id, amount, gateway: def.id, reference: r.transaction_id,
        method: "boleto", metadata: { checkoutUrl: slip, digitable_line: r.bank_slip?.digitable_line },
      });
      return { ...base, transactionId, checkoutUrl: slip };
    }

    // --------------------------------------------------------------- CajuPay
    case "cajupay": {
      const baseUrl = (cfg["cajupay_base_url"] || "https://api.cajupay.com.br").replace(/\/$/, "");
      // OAuth2 client_credentials (par client_id + client_secret)
      const tokenRes = await fetch(`${baseUrl}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${cfg["cajupay_client_id"]}:${cfg["cajupay_client_secret"]}`)}`,
        },
        body: new URLSearchParams({ grant_type: "client_credentials" }),
      });
      const tokenJson: any = await tokenRes.json().catch(() => null);
      const accessToken = tokenJson?.access_token;
      if (!tokenRes.ok || !accessToken) {
        throw new Error(`CajuPay: falha na autenticação (${tokenJson?.error || tokenRes.status})`);
      }

      const res = await fetch(`${baseUrl}/v1/charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          reference: ref,
          amount: cents,
          description,
          payment_method: data.method === "credit_card" ? "credit_card" : data.method,
          due_days: 3,
          callback_url: `${publicUrl()}/api/public/webhooks/cajupay`,
          return_url: returnUrl,
          customer: {
            name: customer.name,
            email: customer.email,
            document: customer.taxId,
            phone: customer.phone,
          },
        }),
      });
      const json: any = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error(`CajuPay: ${json?.message || res.status}`);

      const transactionId = await recordTransaction({
        userId, invoiceId: invoice.id, amount, gateway: def.id,
        reference: json.id || json.charge_id || ref, method: data.method,
        metadata: { checkoutUrl: json.checkout_url || json.payment_url },
      });

      if (data.method === "pix") {
        return {
          ...base,
          transactionId,
          pixCode: json.pix?.qr_code || json.qr_code,
          qrCodeUrl: json.pix?.qr_code_image || json.qr_code_image,
          checkoutUrl: json.checkout_url,
        };
      }
      return { ...base, transactionId, checkoutUrl: json.checkout_url || json.payment_url || json.boleto?.url };
    }

    default:
      throw new Error(`Gateway não implementado: ${def.id}`);
  }
}
