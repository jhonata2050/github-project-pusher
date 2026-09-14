import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AffiliateAccount, AffiliateReferral } from "./types";

/**
 * Funções auxiliares para leitura e gravação segura no system_settings
 */
export async function getAffiliatesStore(): Promise<Record<string, AffiliateAccount>> {
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

export async function saveAffiliatesStore(store: Record<string, AffiliateAccount>): Promise<void> {
  await supabaseAdmin.from("system_settings").upsert(
    {
      key: "affiliates_accounts_store",
      value: store as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}

export async function getReferralsStore(): Promise<AffiliateReferral[]> {
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

export async function saveReferralsStore(referrals: AffiliateReferral[]): Promise<void> {
  await supabaseAdmin.from("system_settings").upsert(
    {
      key: "affiliates_referrals_store",
      value: referrals as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}

export function generateAffiliateCode(name?: string, email?: string): string {
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
