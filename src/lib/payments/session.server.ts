import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ALL_GATEWAY_SETTING_KEYS, gatewayById, type PaymentMethod, GATEWAYS } from "../gateways";
import type { PaymentResult, PaymentCustomer, GatewaySessionParams } from "./types";
import { onlyDigits } from "./types";
import { publicUrl } from "./url";
import { createAbacatePaySession } from "./gateways/abacatepay.gateway";
import { createStripeSession } from "./gateways/stripe.gateway";
import { createMercadoPagoSession } from "./gateways/mercadopago.gateway";
import { createWooviSession } from "./gateways/woovi.gateway";
import { createPagHiperSession } from "./gateways/paghiper.gateway";
import { createCajuPaySession } from "./gateways/cajupay.gateway";
import { createMisticPaySession } from "./gateways/misticpay.gateway";

/**
 * Creates a payment session with a specific gateway.
 */
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
  const customer: PaymentCustomer = {
    name: profile?.full_name || "Cliente Eqsam",
    email: profile?.email || "cliente@exemplo.com",
    taxId: onlyDigits(profile?.tax_id) || "00000000191",
    phone: onlyDigits(profile?.phone) || "11999999999",
  };
  const returnUrl = `${publicUrl()}/invoices/${invoice.id}`;

  const base = { method: data.method, gateway: def.id, amount } as const;

  const params: GatewaySessionParams = {
    userId,
    invoice,
    profile,
    method: data.method,
    cfg,
    customer,
    amount,
    cents,
    ref,
    description,
    returnUrl,
    base,
  };

  switch (def.id) {
    case "abacatepay":
      return createAbacatePaySession(params);
    case "stripe":
      return createStripeSession(params);
    case "mercadopago":
      return createMercadoPagoSession(params);
    case "woovi":
      return createWooviSession(params);
    case "paghiper":
      return createPagHiperSession(params);
    case "cajupay":
      return createCajuPaySession(params);
    case "misticpay":
      return createMisticPaySession(params);
    default:
      throw new Error(`Gateway não implementado: ${def.id}`);
  }
}

/**
 * Creates a payment session attempting configured priorities and automatic failover fallback.
 */
export async function createPaymentSessionWithFallback(
  userId: string,
  data: { invoiceId: string; method: PaymentMethod; gateway?: string },
): Promise<PaymentResult> {
  // 1. Obter configurações do sistema
  const { data: settingsRows } = await supabaseAdmin
    .from("system_settings")
    .select("*")
    .in("key", [
      "payment_gateway_priority", 
      "payment_gateway_fallback_enabled",
      "gateway_priority_pix",
      "gateway_priority_credit_card",
      "gateway_priority_boleto"
    ]);

  const settings: Record<string, any> = {};
  settingsRows?.forEach((row: { key: string; value: any }) => { settings[row.key] = row.value; });

  // Obter prioridade específica para o método
  const methodPriorityKey = 
    data.method === "pix" ? "gateway_priority_pix" :
    data.method === "credit_card" ? "gateway_priority_credit_card" :
    data.method === "boleto" ? "gateway_priority_boleto" : null;

  let priorityStr = (methodPriorityKey ? (settings[methodPriorityKey] as string) : "") || "";
  
  // Se não houver prioridade para o método, usa a global
  if (!priorityStr) {
    priorityStr = (settings["payment_gateway_priority"] as string) || "";
  }

  let priorityList = priorityStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Se a lista de prioridade ainda estiver vazia, tenta encontrar qualquer gateway configurado para o método
  if (priorityList.length === 0) {
    console.log(`[Payment] Nenhuma prioridade definida para ${data.method}. Buscando gateways compatíveis.`);
    priorityList = GATEWAYS
      .filter(g => g.methods.includes(data.method))
      .map(g => g.id);
  }

  const isFallbackEnabled = settings["payment_gateway_fallback_enabled"] !== false; // Padrão true se não existir

  // 2. Construir lista de gateways para tentar
  // Se o usuário solicitou um gateway específico, ele deve vir primeiro.
  // Caso contrário, usamos a lista de prioridade.
  const gatewaysToTry = isFallbackEnabled 
    ? Array.from(new Set(data.gateway ? [data.gateway, ...priorityList] : priorityList))
    : [data.gateway || priorityList[0]];

  let lastError: Error | null = null;

  for (const gatewayId of gatewaysToTry) {
    try {
      if (!gatewayId) continue;
      const def = gatewayById(gatewayId);
      if (!def) {
        console.warn(`[Payment] Gateway ${gatewayId} não encontrado na definição.`);
        continue;
      }

      if (!def.methods.includes(data.method)) {
        console.log(`[Payment] Gateway ${gatewayId} ignorado (não suporta ${data.method})`);
        continue;
      }

      console.log(`[Payment] Tentando gateway: ${gatewayId} para o método ${data.method}`);
      
      // Timeout de 15 segundos para cada tentativa de gateway individual
      const result = await Promise.race([
        createPaymentSession(userId, { ...data, gateway: gatewayId } as any),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout no gateway ${gatewayId}`)), 15000)
        )
      ]);

      return result;
    } catch (err: any) {
      console.error(`[Payment] Erro no gateway ${gatewayId}:`, err.message);
      lastError = err;
      
      // Erros de validação de fatura devem interromper o fallback
      if (
        err.message.includes("Fatura já está paga") || 
        err.message.includes("Fatura não encontrada") ||
        err.message.includes("já está disponível neste fluxo") ||
        err.message.includes("Unauthorized")
      ) {
        throw err;
      }
      
      if (!isFallbackEnabled) {
        console.log(`[Payment] Fallback desativado. Interrompendo após erro no primeiro gateway.`);
        throw err;
      }
      
      console.log(`[Payment] Tentando próximo gateway da lista...`);
      continue;
    }
  }

  throw lastError || new Error("Nenhum gateway de pagamento disponível no momento para este método.");
}
