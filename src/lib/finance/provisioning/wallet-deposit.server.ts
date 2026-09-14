import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ProvisioningItemResult } from "./types";

export async function handleWalletDepositProvisioning(
  invoice: any,
  item: any
): Promise<ProvisioningItemResult> {
  console.log(`[Provisioning] Creditando saldo na carteira para fatura #${invoice.id}`);
  try {
    const depositAmount = Number(item.amount || invoice.total_amount);
    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("account_balance, full_name, phone")
      .eq("id", invoice.user_id)
      .single();

    const currentBal = Number(userProfile?.account_balance || 0);
    const updatedBal = Number((currentBal + depositAmount).toFixed(2));

    await supabaseAdmin
      .from("profiles")
      .update({
        account_balance: updatedBal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.user_id);

    try {
      await supabaseAdmin.from("wallet_transactions").insert({
        user_id: invoice.user_id,
        type: "deposit",
        amount: depositAmount,
        balance_after: updatedBal,
        description: `Recarga de saldo via ${invoice.payment_method?.toUpperCase() || "PIX"} (Fatura #${invoice.id.slice(0, 8)})`,
        invoice_id: invoice.id,
      });
    } catch (e) {
      console.warn("[Provisioning] Falha ao registrar transação de carteira:", e);
    }

    if (userProfile?.phone) {
      try {
        const { sendWhatsAppMessage } = await import("../../whatsapp.server");
        await sendWhatsAppMessage({
          to: userProfile.phone,
          message: `💰 *Saldo Creditado com Sucesso!*\n\nOlá ${userProfile.full_name},\nSua recarga de *R$ ${depositAmount.toFixed(2)}* foi confirmada e adicionada à sua carteira!\n\nSeu novo saldo disponível é: *R$ ${updatedBal.toFixed(2)}*.`,
          category: "wallet_deposit",
        });
      } catch (wErr) {
        console.warn("[WhatsApp] Falha ao enviar notificação de recarga:", wErr);
      }
    }

    // Automação: Se o cliente possuía faturas pendentes aguardando saldo, auto-pagar imediatamente
    try {
      const { autoPayPendingInvoices } = await import("../../wallet.server");
      await autoPayPendingInvoices(invoice.user_id);
    } catch (autoErr) {
      console.warn("[Wallet AutoPay] Aviso:", autoErr);
    }

    return { success: true, message: `Saldo de R$ ${depositAmount.toFixed(2)} creditado` };
  } catch (depErr: any) {
    console.error("[Provisioning] Erro ao creditar saldo na carteira:", depErr.message);
    return { success: false, error: depErr.message };
  }
}
