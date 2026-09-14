import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function resolveUserId(email: string, whmcsClientId?: string): Promise<string | null> {
  const cleanEmail = email?.trim().toLowerCase();
  const cleanWhmcsId = whmcsClientId?.toString().trim();

  if (!cleanEmail && !cleanWhmcsId) {
    console.log("[Import] Falha ao resolver usuário: e-mail e WHMCS_ID estão vazios.");
    return null;
  }

  // 1. Tenta buscar pelo whmcs_id no banco de perfis (mais preciso)
  if (cleanWhmcsId) {
    const { data: profile } = await (supabaseAdmin
      .from("profiles") as any)
      .select("id")
      .eq("whmcs_id", cleanWhmcsId)
      .maybeSingle();
    
    if (profile?.id) {
      console.log(`[Import] Resolvido via whmcs_id (${cleanWhmcsId}): ${profile.id}`);
      return profile.id;
    }

    // Se não achou no perfil, tenta ver se foi injetado no metadata do usuário
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (!error && users) {
      const user = users.find((u: any) => u.user_metadata?.['whmcs_id']?.toString() === cleanWhmcsId);
      if (user) {
        console.log(`[Import] Resolvido via auth metadata whmcs_id (${cleanWhmcsId}): ${user.id}`);
        return user.id;
      }
    }
  }
  
  // 2. Tenta buscar pelo e-mail no banco de perfis
  if (cleanEmail) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", cleanEmail)
      .maybeSingle();
    
    if (profile?.id) {
      console.log(`[Import] Resolvido via email (${cleanEmail}): ${profile.id}`);
      return profile.id;
    }
  }

  // 3. Fallback: busca no auth.users por e-mail
  if (cleanEmail) {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (!error && users) {
      const user = users.find((u: any) => u.email?.toLowerCase() === cleanEmail);
      if (user) {
        console.log(`[Import] Resolvido via auth email fallback (${cleanEmail}): ${user.id}`);
        return user.id;
      }
    }
  }

  console.log(`[Import] Falha ao resolver usuário: Email=${cleanEmail || "n/a"}, WHMCS_ID=${cleanWhmcsId || "n/a"}`);
  return null;
}

export async function resolveProductId(name: string): Promise<string | null> {
  if (!name) return null;
  const cleanName = name.trim();
  
  const { data: existing } = await supabaseAdmin
    .from("products")
    .select("id")
    .ilike("name", cleanName)
    .maybeSingle();
  if (existing) return existing.id;

  const slug =
    cleanName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `whmcs-${Date.now()}`;

  const { data: created, error } = await supabaseAdmin
    .from("products")
    .insert({
      name: cleanName,
      slug,
      description: "Produto importado automaticamente do WHMCS",
      is_visible: false,
      auto_provision: false,
    })
    .select("id")
    .single();

  if (error) return null;
  return created.id;
}
