import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequest } from "@tanstack/react-start/server";
import { ALL_GATEWAY_SETTING_KEYS, gatewayById, type PaymentMethod } from "./gateways";
import { getCajuPayCredentials, getCajuPayHeaders, readCajuPayError } from "./cajupay.server";

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
  const configured = process.env["PUBLIC_URL"];
  if (configured) return configured.replace(/\/$/, "");
  const previewHost = process.env["LOVABLE_PREVIEW_HOST"];
  if (previewHost) {
    return `${previewHost.startsWith("http") ? "" : "https://"}${previewHost}`.replace(/\/$/, "");
  }
  return new URL(getRequest().url).origin;
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
      metadata: { method: args.method, ...(args.metadata || {}) } as any,
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
    .maybeSingle();

  if (iError || !invoice) throw new Error("Fatura não encontrada");
  if (invoice.status === "paid") throw new Error("Fatura já está paga");

  // O dono da fatura pode pagar; admins podem gerar pagamento para qualquer fatura.
  if (invoice.user_id !== userId) {
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Fatura não encontrada");
  }

  const ownerId = invoice.user_id as string;

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

  const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", ownerId).maybeSingle();

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
        userId: ownerId, invoiceId: invoice.id, amount, gateway: def.id, reference: json.data.id,
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
        userId: ownerId, invoiceId: invoice.id, amount, gateway: def.id, reference: json.id,
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
          userId: ownerId, invoiceId: invoice.id, amount, gateway: def.id, reference: json.id,
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
        userId: ownerId, invoiceId: invoice.id, amount, gateway: def.id, reference: String(json.id),
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
        headers: {
          "Content-Type": "application/json",
          Authorization: cfg["woovi_app_id"] || "",
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
        throw new Error(`Woovi: ${json?.error || res.status} - ${JSON.stringify(json)}`);
      }
      const transactionId = await recordTransaction({
        userId: ownerId,
        invoiceId: invoice.id,
        amount,
        gateway: def.id,
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
          userId: ownerId, invoiceId: invoice.id, amount, gateway: def.id, reference: r.transaction_id,
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
        userId: ownerId, invoiceId: invoice.id, amount, gateway: def.id, reference: r.transaction_id,
        method: "boleto", metadata: { checkoutUrl: slip, digitable_line: r.bank_slip?.digitable_line },
      });
      return { ...base, transactionId, checkoutUrl: slip };
    }

    // --------------------------------------------------------------- CajuPay
    case "cajupay": {
      const credentials = getCajuPayCredentials(cfg);
      if (!credentials.publicKey || !credentials.secretKey) {
        throw new Error("CajuPay: informe a Public Key e a Secret Key.");
      }
      if (data.method === "credit_card") {
        throw new Error("CajuPay: cartão exige o checkout SDK e não está disponível neste fluxo.");
      }

      const isPix = data.method === "pix";
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
        headers: getCajuPayHeaders(credentials, `invoice-${invoice.id}-${data.method}-v3`),
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
        gateway: def.id,
        reference: json.payment_id || json.transaction_id || ref,
        method: data.method,
        metadata: { pix_key: json.pix_key, digitable_line: json.digitable_line },
      });

      if (isPix) {
        return {
          ...base,
          transactionId,
          pixCode: json.pix_copy_paste,
          qrCodeUrl: json.pix_qr_code,
        };
      }
      return { ...base, transactionId, checkoutUrl: json.boleto_url || json.pdf_url || json.url };
    }

    default:
      throw new Error(`Gateway não implementado: ${def.id}`);
  }
}

export async function createPaymentSessionWithFallback(
  userId: string,
  data: { invoiceId: string; method: PaymentMethod; gateway: string },
): Promise<PaymentResult> {
  // 1. Obter configurações do sistema
  const { data: settingsRows } = await supabaseAdmin
    .from("system_settings")
    .select("*")
    .in("key", ["payment_gateway_priority", "payment_gateway_fallback_enabled"]);

  const settings: Record<string, any> = {};
  settingsRows?.forEach(row => { settings[row.key] = row.value; });

  const priorityStr = (settings["payment_gateway_priority"] as string) || "";
  const priorityList = priorityStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const isFallbackEnabled = settings["payment_gateway_fallback_enabled"] !== false; // Padrão true se não existir

  // 2. Construir lista de gateways para tentar
  // Se fallback estiver desativado, tentamos apenas o solicitado.
  const gatewaysToTry = isFallbackEnabled 
    ? Array.from(new Set([data.gateway, ...priorityList]))
    : [data.gateway];

  let lastError: Error | null = null;

  for (const gatewayId of gatewaysToTry) {
    try {
      const def = gatewayById(gatewayId);
      if (!def || !def.methods.includes(data.method)) {
        console.log(`[Payment] Gateway ${gatewayId} ignorado (não suporta ${data.method})`);
        continue;
      }

      console.log(`[Payment] Tentando gateway: ${gatewayId} para o método ${data.method}`);
      return await createPaymentSession(userId, { ...data, gateway: gatewayId });
    } catch (err: any) {
      console.error(`[Payment] Erro no gateway ${gatewayId}:`, err.message);
      lastError = err;
      
      // Erros fatais que não devem disparar fallback
      if (
        err.message.includes("Fatura já está paga") || 
        err.message.includes("Fatura não encontrada") ||
        err.message.includes("já está disponível neste fluxo") // Ex: CajuPay + Cartão
      ) {
        throw err;
      }
      
      if (!isFallbackEnabled) throw err;
      continue;
    }
  }

  throw lastError || new Error("Nenhum gateway de pagamento disponível no momento para este método.");
}
