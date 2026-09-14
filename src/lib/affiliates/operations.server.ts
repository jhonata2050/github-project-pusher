import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AffiliateAccount, AffiliateReferral } from "./types";
import {
  getAffiliatesStore,
  saveAffiliatesStore,
  getReferralsStore,
  saveReferralsStore,
  generateAffiliateCode,
} from "./store.server";
import { getGlobalAffiliateSettings } from "./settings.server";

/**
 * Obter ou criar a conta de afiliado de um cliente
 */
export async function getOrCreateAffiliate(supabaseClient: any, userId: string): Promise<AffiliateAccount> {
  const store = await getAffiliatesStore();

  if (store[userId]) {
    const aff = store[userId];
    return {
      ...aff,
      commission_percent: Number(aff.commission_percent ?? 10),
      total_clicks: Number(aff.total_clicks ?? 0),
      total_sales: Number(aff.total_sales ?? 0),
      pending_commission: Number(aff.pending_commission ?? 0),
      available_balance: Number(aff.available_balance ?? 0),
      paid_earnings: Number(aff.paid_earnings ?? 0),
      is_active: aff.is_active ?? true,
    };
  }

  // Buscar perfil para gerar código amigável
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", userId)
    .maybeSingle();

  const globalSettings = await getGlobalAffiliateSettings();
  let code = generateAffiliateCode(profile?.full_name, profile?.email);

  // Garantir unicidade do código
  const existingCodes = Object.values(store).map((a) => a.code.toLowerCase());
  while (existingCodes.includes(code.toLowerCase())) {
    code = generateAffiliateCode(profile?.full_name, profile?.email);
  }

  const newAccount: AffiliateAccount = {
    id: userId,
    user_id: userId,
    code,
    commission_percent: Number(globalSettings.defaultPercent || 10),
    total_clicks: 0,
    total_sales: 0,
    pending_commission: 0,
    available_balance: 0,
    paid_earnings: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profiles: profile
      ? {
          full_name: profile.full_name || "Cliente",
          email: profile.email || "",
          phone: profile.phone || "",
        }
      : null,
  };

  store[userId] = newAccount;
  await saveAffiliatesStore(store);

  return newAccount;
}

/**
 * Rastrear clique no link de afiliado
 */
export async function trackAffiliateClick(code: string): Promise<{ success: boolean; affiliateCode?: string }> {
  if (!code || typeof code !== "string") return { success: false };
  const cleanCode = code.trim().toLowerCase();

  const store = await getAffiliatesStore();
  const matchedUserId = Object.keys(store).find(
    (uid) => store[uid]?.code && store[uid]?.code?.toLowerCase() === cleanCode
  );

  const matchedEntry = matchedUserId ? store[matchedUserId] : undefined;
  if (matchedEntry) {
    matchedEntry.total_clicks = Number(matchedEntry.total_clicks || 0) + 1;
    matchedEntry.updated_at = new Date().toISOString();
    await saveAffiliatesStore(store);
    return { success: true, affiliateCode: cleanCode };
  }

  // Se o código ainda não está no store, localizar perfil correspondente
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, phone");

  for (const p of profiles || []) {
    const expectedCode = generateAffiliateCode(p.full_name, p.email);
    if (
      cleanCode === expectedCode.toLowerCase() ||
      cleanCode === p.id ||
      cleanCode.includes(p.email.split("@")[0].toLowerCase())
    ) {
      const aff = await getOrCreateAffiliate(null, p.id);
      aff.total_clicks = Number(aff.total_clicks || 0) + 1;
      store[p.id] = aff;
      await saveAffiliatesStore(store);
      return { success: true, affiliateCode: aff.code };
    }
  }

  return { success: false };
}

/**
 * Atualizar comissão de afiliado específico
 */
export async function updateAffiliatePercent(affiliateId: string, commissionPercent: number, isActive?: boolean): Promise<AffiliateAccount> {
  const store = await getAffiliatesStore();
  const aff = store[affiliateId];
  if (!aff) throw new Error("Afiliado não encontrado");

  aff.commission_percent = Number(commissionPercent);
  if (isActive !== undefined) aff.is_active = isActive;
  aff.updated_at = new Date().toISOString();

  store[affiliateId] = aff;
  await saveAffiliatesStore(store);

  return aff;
}

/**
 * Processar comissão de afiliado após pagamento de fatura
 */
export async function processAffiliateCommission(invoiceId: string, customAffCode?: string): Promise<void> {
  try {
    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("id, user_id, status, total_amount, order_id, notes, invoice_items(amount, service_id, services(product_id))")
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

    const productRules: Record<string, { type: "percentage" | "fixed"; value: number; isEnabled: boolean }> =
      prodRulesData?.value
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
            totalCommission += Number(((itemAmount * Number(customRule.value || 10)) / 100).toFixed(2));
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
    affiliate.available_balance = Number((Number(affiliate.available_balance || 0) + totalCommission).toFixed(2));
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
        const { sendWhatsAppMessage } = await import("../whatsapp.server");
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

/**
 * Resgatar saldo de comissão para a carteira
 */
export async function withdrawAffiliateToWallet(userId: string, amount: number) {
  const cleanAmount = Number(Number(amount).toFixed(2));
  if (isNaN(cleanAmount) || cleanAmount <= 0) {
    throw new Error("Valor de resgate inválido.");
  }

  const store = await getAffiliatesStore();
  const aff = store[userId];
  if (!aff) throw new Error("Conta de afiliado não encontrada.");

  const currentAvailable = Number(aff.available_balance || 0);
  if (currentAvailable < cleanAmount) {
    throw new Error(`Saldo insuficiente. Você tem R$ ${currentAvailable.toFixed(2)} disponíveis para resgate.`);
  }

  const newAffBalance = Number((currentAvailable - cleanAmount).toFixed(2));
  const newPaidEarnings = Number((Number(aff.paid_earnings || 0) + cleanAmount).toFixed(2));

  aff.available_balance = newAffBalance;
  aff.paid_earnings = newPaidEarnings;
  aff.updated_at = new Date().toISOString();
  store[userId] = aff;
  await saveAffiliatesStore(store);

  // Creditar na carteira do cliente
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("account_balance, full_name, phone")
    .eq("id", userId)
    .single();

  const currentWallet = Number(profile?.account_balance || 0);
  const newWallet = Number((currentWallet + cleanAmount).toFixed(2));

  await supabaseAdmin
    .from("profiles")
    .update({
      account_balance: newWallet,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return {
    success: true,
    transferredAmount: cleanAmount,
    newAffiliateBalance: newAffBalance,
    newWalletBalance: newWallet,
  };
}

/**
 * Obter referências do afiliado
 */
export async function getAffiliateReferrals(supabaseClient: any, affiliateId: string): Promise<AffiliateReferral[]> {
  const referrals = await getReferralsStore();
  const filtered = referrals.filter((r) => r.affiliate_id === affiliateId);

  // Enriquecer com nomes de clientes
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, email");
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, { full_name: p.full_name || "", email: p.email || "" }]));

  return filtered.map((r) => ({
    ...r,
    profiles: r.referred_user_id ? profileMap.get(r.referred_user_id) || null : null,
  })) as AffiliateReferral[];
}

/**
 * Listagem administrativa
 */
export async function getAdminAffiliatesList(supabaseClient: any): Promise<AffiliateAccount[]> {
  const store = await getAffiliatesStore();
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, email, phone");

  // Auto-registrar todos os perfis existentes no sistema como afiliados se ainda não existirem
  for (const p of profiles || []) {
    const existing = store[p.id];
    if (!existing) {
      const globalSettings = await getGlobalAffiliateSettings();
      store[p.id] = {
        id: p.id,
        user_id: p.id,
        code: generateAffiliateCode(p.full_name, p.email),
        commission_percent: Number(globalSettings.defaultPercent || 10),
        total_clicks: 0,
        total_sales: 0,
        pending_commission: 0,
        available_balance: 0,
        paid_earnings: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profiles: {
          full_name: p.full_name || "Cliente",
          email: p.email || "",
          phone: p.phone || "",
        },
      };
    } else {
      existing.profiles = {
        full_name: p.full_name || "Cliente",
        email: p.email || "",
        phone: p.phone || "",
      };
    }
  }

  await saveAffiliatesStore(store);
  return Object.values(store).sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0));
}
