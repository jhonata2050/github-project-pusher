import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { WalletTransaction } from "./types";

/**
 * Obter dados da carteira do cliente (saldo e transações)
 */
export async function getWalletData(supabaseClient: any, userId: string) {
  // 1. Obter saldo do perfil
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("account_balance, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  const balance = Number(profile?.account_balance || 0);

  // 2. Obter extrato de transações
  let transactions: WalletTransaction[] = [];
  try {
    const { data: txs, error } = await supabaseClient
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && txs) {
      transactions = txs.map((t: any) => ({
        ...t,
        amount: Number(t.amount),
        balance_after: Number(t.balance_after),
      }));
    }
  } catch (e) {
    // Tabela pode ainda estar sendo criada no schema
  }

  return {
    balance,
    profile,
    transactions,
  };
}

/**
 * Criar pedido e fatura de Adição de Saldo / Depósito (Ultra-resiliente)
 */
export async function createWalletDeposit(supabaseClient: any, userId: string, amount: number) {
  const cleanAmount = Number(Number(amount).toFixed(2));
  if (isNaN(cleanAmount) || cleanAmount < 5.00) {
    throw new Error("O valor mínimo para adicionar saldo é de R$ 5,00.");
  }
  if (cleanAmount > 50000.00) {
    throw new Error("O valor máximo para adicionar saldo é de R$ 50.000,00.");
  }

  const client = supabaseClient || supabaseAdmin;

  // 1. Tentar criar Pedido
  let orderId: string | null = null;
  try {
    const { data: order, error: oError } = await client
      .from("orders")
      .insert({
        user_id: userId,
        total_amount: cleanAmount,
        status: "pending",
      })
      .select()
      .maybeSingle();

    if (order) {
      orderId = order.id;
    }
  } catch (err: any) {
    console.warn("[Wallet] Exceção ao criar order:", err.message);
  }

  // 2. Criar Fatura
  const invoicePayload: any = {
    user_id: userId,
    total_amount: cleanAmount,
    subtotal: cleanAmount,
    discount_amount: 0,
    due_date: new Date().toISOString(),
    status: "pending",
    payment_method: "pix",
    notes: `Recarga de Saldo na Carteira Pré-paga: R$ ${cleanAmount.toFixed(2)}`,
  };
  if (orderId) {
    invoicePayload.order_id = orderId;
  }

  let invoice: any = null;
  const res1 = await client
    .from("invoices")
    .insert(invoicePayload)
    .select()
    .single();

  if (res1.data) {
    invoice = res1.data;
  } else {
    const res2 = await supabaseAdmin
      .from("invoices")
      .insert(invoicePayload)
      .select()
      .single();
    if (res2.data) {
      invoice = res2.data;
    } else {
      console.error("[Wallet] Erro fatal ao gerar fatura:", res1.error || res2.error);
      throw new Error(`Falha ao gerar fatura de recarga: ${res1.error?.message || res2.error?.message || "Erro de permissão"}`);
    }
  }

  // 3. Criar Item de Fatura
  await (supabaseClient || supabaseAdmin).from("invoice_items").insert({
    invoice_id: invoice.id,
    description: `Adição de Saldo na Carteira (Pré-pago): R$ ${cleanAmount.toFixed(2)}`,
    amount: cleanAmount,
  });

  return {
    invoiceId: invoice.id,
    orderId,
    amount: cleanAmount,
  };
}
