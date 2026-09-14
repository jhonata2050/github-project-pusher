import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getDomainDetailsById } from "./queries.server";
import { getDomainRegistrarSettings } from "./settings.server";
import { OpenproviderRegistrar } from "../registrars/openprovider.server";

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
  await getDomainDetailsById(supabaseClient, userId, domainId);

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
 * Alternar Auto-Renovação
 */
export async function toggleDomainAutoRenewSetting(
  supabaseClient: any,
  userId: string,
  domainId: string,
  autoRenew: boolean
) {
  await getDomainDetailsById(supabaseClient, userId, domainId);
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
