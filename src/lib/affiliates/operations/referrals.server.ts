import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AffiliateAccount, AffiliateReferral } from "../types";
import {
  getAffiliatesStore,
  saveAffiliatesStore,
  getReferralsStore,
  generateAffiliateCode,
} from "../store.server";
import { getGlobalAffiliateSettings } from "../settings.server";

/**
 * Obter referências do afiliado
 */
export async function getAffiliateReferrals(
  supabaseClient: any,
  affiliateId: string
): Promise<AffiliateReferral[]> {
  const referrals = await getReferralsStore();
  const filtered = referrals.filter((r) => r.affiliate_id === affiliateId);

  // Enriquecer com nomes de clientes
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email");
  const profileMap = new Map(
    (profiles || []).map((p: any) => [
      p.id,
      { full_name: p.full_name || "", email: p.email || "" },
    ])
  );

  return filtered.map((r) => ({
    ...r,
    profiles: r.referred_user_id ? profileMap.get(r.referred_user_id) || null : null,
  })) as AffiliateReferral[];
}

/**
 * Listagem administrativa
 */
export async function getAdminAffiliatesList(
  supabaseClient: any
): Promise<AffiliateAccount[]> {
  const store = await getAffiliatesStore();
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, phone");

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
