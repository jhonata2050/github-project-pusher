import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

  // 2. Executar Débito e Liquidação Atômica (Previne Race Conditions / TOCTOU / Double Spending)
  let newBalance = 0;
  let clientPhone: string | null = null;
  let clientName: string | null = null;

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", invoice.user_id)
      .maybeSingle();
    clientPhone = profile?.phone || null;
    clientName = profile?.full_name || null;
  } catch (e) {}

  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("debit_wallet_balance", {
    _user_id: invoice.user_id,
    _amount: invoiceAmount,
    _invoice_id: invoice.id,
  });

  if (!rpcError && rpcResult) {
    if (!rpcResult.success) {
      throw new Error(rpcResult.error || "Saldo insuficiente para pagar esta fatura.");
    }
    newBalance = Number(rpcResult.balance_after);
  } else {
    // Fallback defensivo com condição atômica gte caso a RPC ainda não tenha sido aplicada no banco
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

    newBalance = Number((currentBalance - invoiceAmount).toFixed(2));

    // Debitar com cláusula atômica: só debita se account_balance for >= invoiceAmount
    const { error: updProfileErr } = await supabaseAdmin
      .from("profiles")
      .update({
        account_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .gte("account_balance", invoiceAmount);

    if (updProfileErr) {
      throw new Error("Concorrência de requisições detectada ou saldo insuficiente durante a liquidação.");
    }

    // Liquidar a fatura
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

    // Registrar no extrato
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
  }

  // 6. Processar Provisionamento Automático de Serviços/Domínios
  try {
    const { processProvisioning } = await import("../finance.server");
    await processProvisioning(invoice.id);
  } catch (provErr: any) {
    console.error("[Wallet] Erro no provisionamento pós-pagamento:", provErr.message);
  }

  // 7. Notificar Cliente via WhatsApp
  if (clientPhone) {
    try {
      const { sendWhatsAppMessage } = await import("../whatsapp.server");
      await sendWhatsAppMessage({
        to: clientPhone,
        message: `💳 *Fatura Paga com Saldo em Conta!*\n\nOlá ${clientName || "Cliente"},\nA fatura *#${invoice.id.slice(0, 8)}* no valor de *R$ ${invoiceAmount.toFixed(2)}* foi liquidada com sucesso utilizando o saldo da sua carteira.\n\nSeu novo saldo é: *R$ ${newBalance.toFixed(2)}*.`,
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
