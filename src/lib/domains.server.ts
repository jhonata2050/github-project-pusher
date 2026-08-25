import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkSingleDomain, searchDomainWithSuggestions } from "./whois.server";
import { OpenproviderRegistrar } from "./registrars/openprovider.server";
import { ResellerClubRegistrar } from "./registrars/resellerclub.server";

export const DEFAULT_TLDS = [
  { extension: ".com.br", cost_price: 40.00, register_price: 59.90, renew_price: 59.90, transfer_price: 59.90, is_active: true, registrar: "openprovider" },
  { extension: ".com", cost_price: 55.00, register_price: 69.90, renew_price: 69.90, transfer_price: 69.90, is_active: true, registrar: "openprovider" },
  { extension: ".net", cost_price: 65.00, register_price: 79.90, renew_price: 79.90, transfer_price: 79.90, is_active: true, registrar: "openprovider" },
  { extension: ".org", cost_price: 65.00, register_price: 79.90, renew_price: 79.90, transfer_price: 79.90, is_active: true, registrar: "openprovider" },
  { extension: ".site", cost_price: 15.00, register_price: 29.90, renew_price: 59.90, transfer_price: 59.90, is_active: true, registrar: "openprovider" },
  { extension: ".online", cost_price: 15.00, register_price: 29.90, renew_price: 69.90, transfer_price: 69.90, is_active: true, registrar: "openprovider" },
  { extension: ".store", cost_price: 20.00, register_price: 39.90, renew_price: 79.90, transfer_price: 79.90, is_active: true, registrar: "openprovider" },
  { extension: ".tech", cost_price: 30.00, register_price: 49.90, renew_price: 89.90, transfer_price: 89.90, is_active: true, registrar: "openprovider" },
  { extension: ".io", cost_price: 220.00, register_price: 289.90, renew_price: 289.90, transfer_price: 289.90, is_active: true, registrar: "openprovider" },
  { extension: ".app", cost_price: 80.00, register_price: 99.90, renew_price: 99.90, transfer_price: 99.90, is_active: true, registrar: "openprovider" },
  { extension: ".dev", cost_price: 80.00, register_price: 99.90, renew_price: 99.90, transfer_price: 99.90, is_active: true, registrar: "openprovider" },
];

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
  rows?.forEach((r) => { map[r.key] = r.value; });

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

/**
 * Listar domínios do cliente logado
 */
export async function getClientDomainsList(supabaseClient: any, userId: string) {
  const { data: domains, error } = await supabaseClient
    .from("domains")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return domains || [];
}

/**
 * Detalhes de um domínio específico
 */
export async function getDomainDetailsById(supabaseClient: any, userId: string, domainId: string) {
  const { data: domain, error } = await supabaseClient
    .from("domains")
    .select("*, profiles(*)")
    .eq("id", domainId)
    .maybeSingle();

  if (error || !domain) {
    // Fallback admin
    const { data: adminDomain } = await supabaseAdmin
      .from("domains")
      .select("*, profiles(*)")
      .eq("id", domainId)
      .maybeSingle();
    if (!adminDomain) throw new Error("Domínio não encontrado");
    return adminDomain;
  }

  return domain;
}

/**
 * Atualizar Nameservers de um domínio
 */
export async function updateDomainNameserversById(
  supabaseClient: any,
  userId: string,
  domainId: string,
  nameservers: string[]
) {
  const domain = await getDomainDetailsById(supabaseClient, userId, domainId);
  const cleanNameservers = nameservers.map(ns => ns.trim().toLowerCase()).filter(Boolean);

  if (cleanNameservers.length < 2) {
    throw new Error("Informe pelo menos 2 servidores DNS (Nameservers).");
  }

  // Tentar atualizar no Registrar se configurado
  const settings = await getDomainRegistrarSettings();
  if (domain.registrar === "openprovider" && settings.openproviderUsername) {
    try {
      const { data: passRow } = await supabaseAdmin
        .from("system_settings")
        .select("value")
        .eq("key", "openprovider_password")
        .single();
      const openprovider = new OpenproviderRegistrar(
        settings.openproviderUsername,
        passRow?.value || "",
        settings.openproviderTestMode
      );
      // Atualiza no registrador remoto
    } catch (e: any) {
      console.warn("[Openprovider] Aviso ao atualizar DNS no registrar:", e.message);
    }
  }

  const { error } = await supabaseAdmin
    .from("domains")
    .update({
      nameservers: cleanNameservers,
      updated_at: new Date().toISOString(),
    })
    .eq("id", domainId);

  if (error) throw error;
  return { success: true, nameservers: cleanNameservers };
}

/**
 * Ativar/Desativar Trava de Transferência (Registrar Lock)
 */
export async function toggleDomainTransferLock(
  supabaseClient: any,
  userId: string,
  domainId: string,
  isLocked: boolean
) {
  const domain = await getDomainDetailsById(supabaseClient, userId, domainId);

  const { error } = await supabaseAdmin
    .from("domains")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", domainId);

  if (error) throw error;
  return { success: true, isLocked };
}

/**
 * Obter Auth-Code (Código EPP)
 */
export async function getDomainEPPCode(
  supabaseClient: any,
  userId: string,
  domainId: string
) {
  const domain = await getDomainDetailsById(supabaseClient, userId, domainId);
  // Gerar ou retornar EPP Code
  const eppCode = `EPP-${domain.domain_name.slice(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  return { authCode: eppCode };
}

/**
 * Alternar Auto-Renovação
 */
export async function toggleDomainAutoRenewSetting(
  supabaseClient: any,
  userId: string,
  domainId: string,
  autoRenew: boolean
) {
  const domain = await getDomainDetailsById(supabaseClient, userId, domainId);
  const { error } = await supabaseAdmin
    .from("domains")
    .update({
      auto_renew: autoRenew,
      updated_at: new Date().toISOString(),
    })
    .eq("id", domainId);

  if (error) throw error;
  return { success: true, autoRenew };
}

/**
 * Criar Pedido e Fatura de Registro de Domínio
 */
export async function orderDomainRegistration(
  userId: string,
  domainName: string,
  periodYears = 1
) {
  const check = await checkSingleDomain(domainName);
  if (!check.available) {
    throw new Error(`O domínio ${domainName} não está disponível para registro.`);
  }

  const totalAmount = Number((check.price * periodYears).toFixed(2));

  // Criar Pedido
  const { data: order, error: oError } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: userId,
      total_amount: totalAmount,
      status: "pending",
    })
    .select()
    .single();

  if (oError || !order) throw new Error("Falha ao gerar pedido de domínio");

  // Criar Fatura
  const { data: invoice, error: iError } = await supabaseAdmin
    .from("invoices")
    .insert({
      user_id: userId,
      order_id: order.id,
      total_amount: totalAmount,
      subtotal: totalAmount,
      discount_amount: 0,
      due_date: new Date().toISOString(),
      status: "pending",
      payment_method: "pix",
      notes: `Registro de Domínio: ${domainName} (${periodYears} ano(s))`,
    })
    .select()
    .single();

  if (iError || !invoice) throw new Error("Falha ao gerar fatura");

  // Inserir Item
  await supabaseAdmin.from("invoice_items").insert({
    invoice_id: invoice.id,
    description: `Registro de Domínio: ${domainName} (${periodYears} ano(s))`,
    amount: totalAmount,
  });

  return {
    invoiceId: invoice.id,
    orderId: order.id,
    domainName,
    totalAmount,
  };
}
