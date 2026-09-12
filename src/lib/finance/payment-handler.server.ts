import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyAdminWhatsApp, sendWhatsAppMessage } from "../whatsapp.server";
import { processProvisioning } from "./provisioning.server";

/**
 * Função centralizada para processar sucesso de pagamento de qualquer gateway.
 */
export async function handlePaymentSuccess(
  invoiceId: string, 
  gatewayName: string, 
  externalReference?: string
) {
  try {
    console.log(`[Finance] Processando pagamento fatura #${invoiceId} via ${gatewayName}`);

    // 1. Buscar fatura e perfil do cliente
    const { data: invoice, error: iError } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (iError || !invoice) {
      throw new Error(`Fatura #${invoiceId} não encontrada.`);
    }

    let profile: any = null;
    if (invoice.user_id) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", invoice.user_id)
        .maybeSingle();
      profile = p;
    }

    if (invoice.status === "paid") {
      console.log(`[Finance] Fatura #${invoiceId} já está marcada como paga.`);
      return { success: true, already_paid: true };
    }

    // 2. Atualizar fatura
    const { data: updatedInvoice, error: updateError } = await supabaseAdmin
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: gatewayName
      })
      .eq("id", invoiceId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Atualizar transação relacionada (se houver referência)
    if (externalReference) {
      const { error: tUpdateError } = await supabaseAdmin
        .from("transactions")
        .update({ 
          status: "completed",
          updated_at: new Date().toISOString()
        })
        .eq("gateway_reference", externalReference.toString());
      
      if (tUpdateError) console.warn(`[Finance] Aviso: Não foi possível atualizar transação ${externalReference}:`, tUpdateError.message);
    }

    // 4. Provisionar serviços
    await processProvisioning(invoiceId);

    // 4.1 Processar comissão de afiliados se houver indicação
    try {
      const { processAffiliateCommission } = await import("../affiliates.server");
      await processAffiliateCommission(invoiceId);
    } catch (affErr: any) {
      console.warn(`[Affiliates] Aviso ao processar comissão para fatura #${invoiceId}:`, affErr.message);
    }

    // 5. Notificações
    const amountStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(invoice.total_amount || 0));

    // Notificar Admin
    await notifyAdminWhatsApp(
      `💰 *Pagamento Confirmado*\n\n*Fatura:* #${invoiceId}\n*Valor:* ${amountStr}\n*Gateway:* ${gatewayName}\n*Cliente:* ${profile?.full_name || "N/A"}`,
      "payment_success"
    );

    // Notificar Cliente
    if (profile?.phone) {
      await sendWhatsAppMessage({
        to: profile.phone,
        message: `✅ *Pagamento Recebido!*\n\nOlá ${profile.full_name},\nConfirmamos o recebimento do seu pagamento no valor de ${amountStr}.\n\nSeu serviço está sendo ativado/renovado agora mesmo.`,
        category: "payment_success"
      });
    }

    // 6. Log de auditoria
    await supabaseAdmin.from("audit_logs").insert({
      action: "payment.processed",
      entity_type: "invoice",
      entity_id: invoiceId,
      description: `Pagamento processado com sucesso para fatura #${invoiceId} via ${gatewayName}`,
      metadata: { invoiceId, gatewayName, externalReference } as any
    });

    return { success: true };
  } catch (error: any) {
    console.error(`[Finance] Erro ao processar pagamento fatura #${invoiceId}:`, error);
    
    await supabaseAdmin.from("audit_logs").insert({
      action: "payment.failed",
      entity_type: "invoice",
      entity_id: invoiceId,
      description: `Erro ao processar pagamento fatura #${invoiceId}: ${error.message}`,
      metadata: { invoiceId, gatewayName, externalReference, error: error.message } as any
    });

    throw error;
  }
}
