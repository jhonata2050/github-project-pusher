import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AffiliateAccount } from "../types";
import {
  getAffiliatesStore,
  saveAffiliatesStore,
  generateAffiliateCode,
} from "../store.server";
import { getGlobalAffiliateSettings } from "../settings.server";

/**
 * Obter ou criar a conta de afiliado de um cliente
 */
export async function getOrCreateAffiliate(
  supabaseClient: any,
  userId: string
): Promise<AffiliateAccount> {
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
export async function trackAffiliateClick(
  code: string
): Promise<{ success: boolean; affiliateCode?: string }> {
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
export async function updateAffiliatePercent(
  affiliateId: string,
  commissionPercent: number,
  isActive?: boolean
): Promise<AffiliateAccount> {
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
