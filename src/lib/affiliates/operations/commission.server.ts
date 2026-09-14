import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AffiliateReferral } from "../types";
import {
  getAffiliatesStore,
  saveAffiliatesStore,
  getReferralsStore,
  saveReferralsStore,
} from "../store.server";

/**
 * Processar comissão de afiliado após pagamento de fatura
 */
export async function processAffiliateCommission(
  invoiceId: string,
  customAffCode?: string
): Promise<void> {
  try {
    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select(
        "id, user_id, status, total_amount, order_id, notes, invoice_items(amount, service_id, services(product_id))"
      )
      .eq("id", invoiceId)
      .single();

    if (!invoice || invoice.status !== "paid") return;

    let affCode = customAffCode || null;
    if (!affCode) {
      const notesStr = `${invoice.notes || ""}`;
      const affMatch = notesStr.match(/aff:([a-zA-Z0-9_-]+)/i);
      if (affMatch && affMatch[1]) {
        affCode = affMatch[1];
      }
    }

    if (!affCode) return;

    const cleanCode = affCode.trim().toLowerCase();
    const store = await getAffiliatesStore();
    const matchedUserId = Object.keys(store).find(
      (uid) => store[uid]?.code && store[uid]?.code?.toLowerCase() === cleanCode
    );

    if (!matchedUserId) return;
    const affiliate = store[matchedUserId];

    if (!affiliate || !affiliate.is_active || affiliate.user_id === invoice.user_id) {
      return; // Não ganha comissão de si próprio
    }

    const { data: prodRulesData } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "affiliate_product_commissions")
      .maybeSingle();

    const productRules: Record<
      string,
      { type: "percentage" | "fixed"; value: number; isEnabled: boolean }
    > = prodRulesData?.value
      ? typeof prodRulesData.value === "string"
        ? JSON.parse(prodRulesData.value)
        : prodRulesData.value
      : {};

    let totalCommission = 0;
    const items = (invoice as any).invoice_items || [];

    if (items.length > 0) {
      for (const item of items) {
        const itemAmount = Number(item.amount || 0);
        const productId = item.services?.product_id;
        const customRule = productId ? productRules[productId] : null;

        if (customRule && customRule.isEnabled !== false) {
          if (customRule.type === "fixed") {
            totalCommission += Number(customRule.value || 0);
          } else {
            totalCommission += Number(
              ((itemAmount * Number(customRule.value || 10)) / 100).toFixed(2)
            );
          }
        } else {
          const commPercent = Number(affiliate.commission_percent || 10);
          totalCommission += Number(((itemAmount * commPercent) / 100).toFixed(2));
        }
      }
    } else {
      const saleAmount = Number(invoice.total_amount || 0);
      const commPercent = Number(affiliate.commission_percent || 10);
      totalCommission += Number(((saleAmount * commPercent) / 100).toFixed(2));
    }

    totalCommission = Number(totalCommission.toFixed(2));
    if (totalCommission <= 0) return;

    const saleAmount = Number(invoice.total_amount || 0);

    // 1. Criar registro de indicação
    const referrals = await getReferralsStore();
    const newRef: AffiliateReferral = {
      id: crypto.randomUUID(),
      affiliate_id: affiliate.id,
      referred_user_id: invoice.user_id,
      invoice_id: invoice.id,
      order_id: invoice.order_id,
      sale_amount: saleAmount,
      commission_amount: totalCommission,
      status: "approved",
      created_at: new Date().toISOString(),
    };
    referrals.unshift(newRef);
    await saveReferralsStore(referrals);

    // 2. Atualizar saldos do afiliado
    affiliate.available_balance = Number(
      (Number(affiliate.available_balance || 0) + totalCommission).toFixed(2)
    );
    affiliate.total_sales = Number(affiliate.total_sales || 0) + 1;
    affiliate.updated_at = new Date().toISOString();
    store[matchedUserId] = affiliate;
    await saveAffiliatesStore(store);

    // 3. Notificar no WhatsApp se configurado
    const { data: affProfile } = await supabaseAdmin
      .from("profiles")
      .select("phone, full_name")
      .eq("id", affiliate.user_id)
      .single();

    if (affProfile?.phone) {
      try {
        const { sendWhatsAppMessage } = await import("../../whatsapp.server");
        await sendWhatsAppMessage({
          to: affProfile.phone,
          message: `🎉 *Você recebeu uma comissão de afiliado!*\n\nOlá ${affProfile.full_name},\nUma nova assinatura foi confirmada através do seu link de indicação!\n\n💰 Comissão creditada: *R$ ${totalCommission.toFixed(2)}*\n💵 Seu saldo disponível para resgate: *R$ ${affiliate.available_balance.toFixed(2)}*.`,
          category: "affiliate_commission",
        });
      } catch (e) {}
    }
  } catch (err: any) {
    console.warn("[Affiliates] Aviso ao processar comissão:", err.message);
  }
}
