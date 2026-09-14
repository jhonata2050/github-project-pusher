import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEFAULT_TLDS } from "./types-and-constants.server";

/**
 * Obter configurações de Registrars
 */
export async function getDomainRegistrarSettings() {
  const { data: rows } = await supabaseAdmin
    .from("system_settings")
    .select("*")
    .in("key", [
      "domain_default_registrar",
      "openprovider_username",
      "openprovider_password",
      "openprovider_test_mode",
      "resellerclub_userid",
      "resellerclub_apikey",
      "resellerclub_test_mode",
      "default_nameserver_1",
      "default_nameserver_2",
      "default_nameserver_3",
      "default_nameserver_4",
      "domain_pricing_list"
    ]);

  const map: Record<string, any> = {};
  rows?.forEach((r: any) => { map[r.key] = r.value; });

  return {
    defaultRegistrar: map["domain_default_registrar"] || "openprovider",
    openproviderUsername: map["openprovider_username"] || "",
    openproviderPassword: map["openprovider_password"] ? "••••••••" : "",
    openproviderTestMode: map["openprovider_test_mode"] === "true" || map["openprovider_test_mode"] === true,
    resellerclubUserid: map["resellerclub_userid"] || "",
    resellerclubApikey: map["resellerclub_apikey"] ? "••••••••" : "",
    resellerclubTestMode: map["resellerclub_test_mode"] === "true" || map["resellerclub_test_mode"] === true,
    defaultNs1: map["default_nameserver_1"] || "ns1.eqsam.com",
    defaultNs2: map["default_nameserver_2"] || "ns2.eqsam.com",
    defaultNs3: map["default_nameserver_3"] || "",
    defaultNs4: map["default_nameserver_4"] || "",
    pricingList: map["domain_pricing_list"] ? JSON.parse(map["domain_pricing_list"]) : DEFAULT_TLDS,
  };
}

/**
 * Salvar configurações de Registrars
 */
export async function saveDomainRegistrarSettings(settings: any) {
  const updates: Array<{ key: string; value: any }> = [
    { key: "domain_default_registrar", value: settings.defaultRegistrar },
    { key: "openprovider_username", value: settings.openproviderUsername },
    { key: "openprovider_test_mode", value: String(!!settings.openproviderTestMode) },
    { key: "resellerclub_userid", value: settings.resellerclubUserid },
    { key: "resellerclub_test_mode", value: String(!!settings.resellerclubTestMode) },
    { key: "default_nameserver_1", value: settings.defaultNs1 || "ns1.eqsam.com" },
    { key: "default_nameserver_2", value: settings.defaultNs2 || "ns2.eqsam.com" },
    { key: "default_nameserver_3", value: settings.defaultNs3 || "" },
    { key: "default_nameserver_4", value: settings.defaultNs4 || "" },
  ];

  if (settings.openproviderPassword && !settings.openproviderPassword.includes("••••")) {
    updates.push({ key: "openprovider_password", value: settings.openproviderPassword });
  }
  if (settings.resellerclubApikey && !settings.resellerclubApikey.includes("••••")) {
    updates.push({ key: "resellerclub_apikey", value: settings.resellerclubApikey });
  }
  if (settings.pricingList) {
    updates.push({ key: "domain_pricing_list", value: JSON.stringify(settings.pricingList) });
  }

  for (const item of updates) {
    await supabaseAdmin.from("system_settings").upsert(item);
  }

  return { success: true };
}

/**
 * Obter Tabela de Preços (TLDs)
 */
export async function getDomainPricingList() {
  const { data: setting } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "domain_pricing_list")
    .maybeSingle();

  if (setting?.value) {
    try {
      return typeof setting.value === "string" ? JSON.parse(setting.value) : setting.value;
    } catch {
      // fallback
    }
  }

  return DEFAULT_TLDS;
}

/**
 * Salvar Tabela de Preços (TLDs)
 */
export async function saveDomainPricingList(tlds: any[]) {
  await supabaseAdmin.from("system_settings").upsert({
    key: "domain_pricing_list",
    value: JSON.stringify(tlds),
  });
  return { success: true };
}
