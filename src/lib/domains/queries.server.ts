import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
  let { data: domain, error } = await supabaseClient
    .from("domains")
    .select("*")
    .eq("id", domainId)
    .maybeSingle();

  if (error || !domain) {
    // Fallback admin
    const { data: adminDomain } = await supabaseAdmin
      .from("domains")
      .select("*")
      .eq("id", domainId)
      .maybeSingle();
    if (!adminDomain) throw new Error("Domínio não encontrado");
    domain = adminDomain;
  }

  if (domain && domain.user_id) {
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", domain.user_id)
      .maybeSingle();
    domain.profiles = p;
  }

  return domain;
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
