import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { GlobalAffiliateSettings, ProductCommissionRule } from "./types";

/**
 * Configurações globais do programa de afiliados
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
  } catch (e) {
    console.warn("[Affiliates] Erro ao obter affiliate_global_settings:", e);
  }

  return {
    defaultPercent: 10,
    cookieDurationDays: 30,
    minWithdrawAmount: 10,
    autoApprove: true,
  };
}

export async function saveGlobalAffiliateSettings(settings: Partial<GlobalAffiliateSettings>): Promise<GlobalAffiliateSettings> {
  const current = await getGlobalAffiliateSettings();
  const updated: GlobalAffiliateSettings = {
    ...current,
    ...settings,
  };

  await supabaseAdmin.from("system_settings").upsert(
    {
      key: "affiliate_global_settings",
      value: updated as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  return updated;
}

/**
 * Regras por produto
 */
export async function getProductCommissionSettings(): Promise<{
  globalSettings: GlobalAffiliateSettings;
  productRules: ProductCommissionRule[];
}> {
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
): Promise<{ success: boolean }> {
  await supabaseAdmin.from("system_settings").upsert(
    {
      key: "affiliate_product_commissions",
      value: rules as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  return { success: true };
}
