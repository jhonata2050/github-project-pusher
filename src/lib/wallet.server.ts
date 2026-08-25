import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: "deposit" | "payment" | "refund" | "bonus" | "adjustment";
  amount: number;
  balance_after: number;
  description: string;
  invoice_id?: string | null;
  created_at: string;
}

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

/**
 * Pagar uma Fatura utilizando o Saldo em Conta
 */
export async function payInvoiceWithBalance(
  supabaseClient: any,
  userId: string,
  invoiceId: string
) {
  // 1. Buscar a Fatura com Itens
  const { data: invoice, error: iError } = await supabaseAdmin
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", invoiceId)
    .maybeSingle();

  if (iError || !invoice) throw new Error("Fatura não encontrada");
  if (invoice.status === "paid") throw new Error("Esta fatura já está paga.");

  // Prevenir que o cliente use saldo para pagar uma fatura de recarga de saldo
  const isDepositInvoice = (invoice as any).invoice_items?.some(
    (item: any) => item.description?.includes("Adição de Saldo") || item.description?.includes("Recarga de Saldo")
  );
  if (isDepositInvoice) {
    throw new Error("Não é possível pagar uma fatura de recarga utilizando saldo em conta.");
  }

  const invoiceAmount = Number(invoice.total_amount);

  // 2. Buscar o Saldo do Cliente
  const { data: profile, error: pError } = await supabaseAdmin
    .from("profiles")
    .select("id, account_balance, full_name, phone")
    .eq("id", invoice.user_id)
    .single();

  if (pError || !profile) throw new Error("Perfil do cliente não encontrado");

  const currentBalance = Number(profile.account_balance || 0);

  if (currentBalance < invoiceAmount) {
    const diff = (invoiceAmount - currentBalance).toFixed(2);
    throw new Error(
      `Saldo insuficiente. Seu saldo atual é R$ ${currentBalance.toFixed(2)}, faltam R$ ${diff} para liquidar esta fatura.`
    );
  }

  const newBalance = Number((currentBalance - invoiceAmount).toFixed(2));

  // 3. Debitar Saldo do Perfil
  const { error: updProfileErr } = await supabaseAdmin
    .from("profiles")
    .update({
      account_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updProfileErr) throw new Error("Falha ao debitar saldo do perfil");

  // 4. Liquidar a Fatura
  const { error: updInvoiceErr } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "paid",
      payment_method: "wallet",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id);

  if (updInvoiceErr) throw new Error("Falha ao liquidar fatura");

  // 5. Registrar Transação no Extrato da Carteira
  try {
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: profile.id,
      type: "payment",
      amount: -invoiceAmount,
      balance_after: newBalance,
      description: `Pagamento da Fatura #${invoice.id.slice(0, 8)}`,
      invoice_id: invoice.id,
    });
  } catch (e) {
    console.warn("[Wallet] Aviso ao salvar extrato de transação:", e);
  }

  // 6. Processar Provisionamento Automático de Serviços/Domínios
  try {
    const { processProvisioning } = await import("./finance.server");
    await processProvisioning(invoice.id);
  } catch (provErr: any) {
    console.error("[Wallet] Erro no provisionamento pós-pagamento:", provErr.message);
  }

  // 7. Notificar Cliente via WhatsApp
  if (profile.phone) {
    try {
      const { sendWhatsAppMessage } = await import("./whatsapp.server");
      await sendWhatsAppMessage({
        to: profile.phone,
        message: `💳 *Fatura Paga com Saldo em Conta!*\n\nOlá ${profile.full_name},\nA fatura *#${invoice.id.slice(0, 8)}* no valor de *R$ ${invoiceAmount.toFixed(2)}* foi liquidada com sucesso utilizando o saldo da sua carteira.\n\nSeu novo saldo é: *R$ ${newBalance.toFixed(2)}*.`,
        category: "invoice_payment"
      });
    } catch (wErr) {
      console.warn("[WhatsApp] Falha ao enviar notificação de carteira:", wErr);
    }
  }

  return {
    success: true,
    invoiceId: invoice.id,
    paidAmount: invoiceAmount,
    newBalance,
  };
}

/**
 * Automação: Renovar/Pagar faturas pendentes automaticamente se o cliente tiver saldo suficiente
 */
export async function autoPayPendingInvoices(userId: string) {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, account_balance, full_name, phone")
      .eq("id", userId)
      .single();

    if (!profile) return { paidCount: 0 };

    let currentBalance = Number(profile.account_balance || 0);
    if (currentBalance <= 0) return { paidCount: 0 };

    // Buscar faturas pendentes do cliente
    const { data: pendingInvoices } = await supabaseAdmin
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("due_date", { ascending: true });

    if (!pendingInvoices || pendingInvoices.length === 0) return { paidCount: 0 };

    let paidCount = 0;

    for (const inv of pendingInvoices) {
      // Ignora faturas de recarga de saldo
      const isDeposit = (inv as any).invoice_items?.some(
        (item: any) => item.description?.includes("Adição de Saldo") || item.description?.includes("Recarga de Saldo")
      );
      if (isDeposit) continue;

      const amount = Number(inv.total_amount);
      if (currentBalance >= amount) {
        console.log(`[Wallet AutoPay] Liquidando fatura #${inv.id} automaticamente com saldo do cliente ${userId}`);
        try {
          await payInvoiceWithBalance(supabaseAdmin, userId, inv.id);
          currentBalance -= amount;
          paidCount++;
        } catch (payErr: any) {
          console.error(`[Wallet AutoPay] Falha ao auto-pagar fatura #${inv.id}:`, payErr.message);
        }
      }
    }

    return { paidCount, remainingBalance: currentBalance };
  } catch (err: any) {
    console.error("[Wallet AutoPay] Erro na rotina de débito automático:", err.message);
    return { paidCount: 0, error: err.message };
  }
}

/**
 * Ajuste Manual de Saldo pelo Administrador
 */
export async function adminAdjustBalance(
  adminUserId: string,
  targetUserId: string,
  amount: number,
  type: "deposit" | "refund" | "bonus" | "adjustment",
  description: string
) {
  // Validar se é Admin
  let isAuthorized = false;
  try {
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: adminUserId,
      _role: "admin",
    });
    if (isAdmin) isAuthorized = true;
  } catch (e) {}

  if (!isAuthorized) {
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .in("role", ["admin", "staff"])
      .maybeSingle();
    if (roleRow) isAuthorized = true;
  }

  if (!isAuthorized) throw new Error("Acesso negado: Apenas administradores podem ajustar saldo.");

  const { data: profile, error: pError } = await supabaseAdmin
    .from("profiles")
    .select("account_balance, full_name, phone")
    .eq("id", targetUserId)
    .single();

  if (pError || !profile) throw new Error("Cliente não encontrado");

  const currentBalance = Number(profile.account_balance || 0);
  const newBalance = Number(Math.max(0, currentBalance + amount).toFixed(2));

  await supabaseAdmin
    .from("profiles")
    .update({
      account_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetUserId);

  try {
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: targetUserId,
      type,
      amount,
      balance_after: newBalance,
      description: description || `Ajuste manual de saldo pelo suporte (${type})`,
    });
  } catch (e) {
    // Ignora
  }

  // Se o saldo aumentou, tentar auto-pagar faturas pendentes que estavam aguardando saldo
  if (amount > 0) {
    setTimeout(() => {
      autoPayPendingInvoices(targetUserId).catch(() => {});
    }, 500);
  }

  return {
    success: true,
    previousBalance: currentBalance,
    newBalance,
    difference: amount,
  };
}
