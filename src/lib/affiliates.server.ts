import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface AffiliateAccount {
  id: string;
  user_id: string;
  code: string;
  commission_percent: number;
  total_clicks: number;
  total_sales: number;
  pending_commission: number;
  available_balance: number;
  paid_earnings: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  } | null;
}

export interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  referred_user_id?: string | null;
  sale_amount: number;
  commission_amount: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  created_at: string;
  invoice_id?: string;
  order_id?: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export interface ProductCommissionRule {
  productId: string;
  productName: string;
  groupName?: string;
  type: "percentage" | "fixed";
  value: number;
  isEnabled: boolean;
}

export interface GlobalAffiliateSettings {
  defaultPercent: number;
  cookieDurationDays: number;
  minWithdrawAmount: number;
  autoApprove: boolean;
}

/**
 * Funções auxiliares para leitura e gravação segura no system_settings
 */
async function getAffiliatesStore(): Promise<Record<string, AffiliateAccount>> {
  try {
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "affiliates_accounts_store")
      .maybeSingle();

    if (data?.value) {
      return typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    }
  } catch (e) {
    console.warn("[Affiliates] Erro ao ler affiliates_accounts_store:", e);
  }
  return {};
}

async function saveAffiliatesStore(store: Record<string, AffiliateAccount>): Promise<void> {
  await supabaseAdmin.from("system_settings").upsert({
    key: "affiliates_accounts_store",
    value: store as any,
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
}

async function getReferralsStore(): Promise<AffiliateReferral[]> {
  try {
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "affiliates_referrals_store")
      .maybeSingle();

    if (data?.value) {
      return typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    }
  } catch (e) {
    console.warn("[Affiliates] Erro ao ler affiliates_referrals_store:", e);
  }
  return [];
}

async function saveReferralsStore(referrals: AffiliateReferral[]): Promise<void> {
  await supabaseAdmin.from("system_settings").upsert({
    key: "affiliates_referrals_store",
    value: referrals as any,
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
}

function generateAffiliateCode(name?: string, email?: string): string {
  const base = name || email?.split("@")[0] || "indica";
  const cleanName = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${cleanName || "user"}${randomSuffix}`;
}

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
    profiles: profile ? {
      full_name: profile.full_name || "Cliente",
      email: profile.email || "",
      phone: profile.phone || "",
    } : null,
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
    (uid) => store[uid].code && store[uid].code.toLowerCase() === cleanCode
  );

  if (matchedUserId && store[matchedUserId]) {
    store[matchedUserId].total_clicks = Number(store[matchedUserId].total_clicks || 0) + 1;
    store[matchedUserId].updated_at = new Date().toISOString();
    await saveAffiliatesStore(store);
    return { success: true, affiliateCode: cleanCode };
  }

  // Se o código ainda não está no store, localizar perfil correspondente
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, phone");

  for (const p of profiles || []) {
    const expectedCode = generateAffiliateCode(p.full_name, p.email);
    if (cleanCode === expectedCode.toLowerCase() || cleanCode === p.id || cleanCode.includes(p.email.split("@")[0].toLowerCase())) {
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
 * Configurações globais
 */
export async function getGlobalAffiliateSettings(): Promise<GlobalAffiliateSettings> {
  try {
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "affiliate_global_settings")
      .maybeSingle();

    if (data?.value) {
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      return {
        defaultPercent: Number(parsed.defaultPercent) || 10,
        cookieDurationDays: Number(parsed.cookieDurationDays) || 30,
        minWithdrawAmount: Number(parsed.minWithdrawAmount) || 10,
        autoApprove: parsed.autoApprove ?? true,
      };
    }
  } catch (e) {}

  return {
    defaultPercent: 10,
    cookieDurationDays: 30,
    minWithdrawAmount: 10,
    autoApprove: true,
  };
}

export async function saveGlobalAffiliateSettings(settings: Partial<GlobalAffiliateSettings>) {
  const current = await getGlobalAffiliateSettings();
  const updated: GlobalAffiliateSettings = {
    ...current,
    ...settings,
  };

  await supabaseAdmin.from("system_settings").upsert({
    key: "affiliate_global_settings",
    value: updated as any,
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });

  return updated;
}

/**
 * Regras por produto
 */
export async function getProductCommissionSettings() {
  const [productsRes, settingsRes, globalSettings] = await Promise.all([
    supabaseAdmin.from("products").select("id, name, slug, product_groups(name)"),
    supabaseAdmin.from("system_settings").select("value").eq("key", "affiliate_product_commissions").maybeSingle(),
    getGlobalAffiliateSettings(),
  ]);

  const savedRules: Record<string, { type: "percentage" | "fixed"; value: number; isEnabled: boolean }> =
    settingsRes.data?.value
      ? typeof settingsRes.data.value === "string"
        ? JSON.parse(settingsRes.data.value)
        : settingsRes.data.value
      : {};

  const productRules: ProductCommissionRule[] = (productsRes.data || []).map((p: any) => {
    const custom = savedRules[p.id];
    return {
      productId: p.id,
      productName: p.name,
      groupName: p.product_groups?.name || "Serviços",
      type: custom?.type || "percentage",
      value: custom?.value !== undefined ? Number(custom.value) : globalSettings.defaultPercent,
      isEnabled: custom?.isEnabled ?? true,
    };
  });

  return {
    globalSettings,
    productRules,
  };
}

export async function saveProductCommissionSettings(
  rules: Record<string, { type: "percentage" | "fixed"; value: number; isEnabled: boolean }>
) {
  await supabaseAdmin.from("system_settings").upsert({
    key: "affiliate_product_commissions",
    value: rules as any,
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });

  return { success: true };
}

/**
 * Atualizar comissão de afiliado específico
 */
export async function updateAffiliatePercent(affiliateId: string, commissionPercent: number, isActive?: boolean) {
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
export async function processAffiliateCommission(invoiceId: string, customAffCode?: string) {
  try {
    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("id, user_id, total_amount, order_id, notes, invoice_items(amount, service_id, services(product_id))")
      .eq("id", invoiceId)
      .single();

    if (!invoice || invoice.status !== "paid") return;

    let affCode = customAffCode || null;
    if (!affCode) {
      const notesStr = `${invoice.notes || ""}`;
      const affMatch = notesStr.match(/aff:([a-zA-Z0-9_-]+)/i);
      if (affMatch) {
        affCode = affMatch[1];
      }
    }

    if (!affCode) return;

    const cleanCode = affCode.trim().toLowerCase();
    const store = await getAffiliatesStore();
    const matchedUserId = Object.keys(store).find(
      (uid) => store[uid].code && store[uid].code.toLowerCase() === cleanCode
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
        const { sendWhatsAppMessage } = await import("./whatsapp.server");
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
  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return filtered.map((r) => ({
    ...r,
    profiles: r.referred_user_id ? profileMap.get(r.referred_user_id) || null : null,
  }));
}

/**
 * Listagem administrativa
 */
export async function getAdminAffiliatesList(supabaseClient: any): Promise<AffiliateAccount[]> {
  const store = await getAffiliatesStore();
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, email, phone");
  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  // Auto-registrar todos os perfis existentes no sistema como afiliados se ainda não existirem
  for (const p of profiles || []) {
    if (!store[p.id]) {
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
      store[p.id].profiles = {
        full_name: p.full_name || "Cliente",
        email: p.email || "",
        phone: p.phone || "",
      };
    }
  }

  await saveAffiliatesStore(store);
  return Object.values(store).sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0));
}
