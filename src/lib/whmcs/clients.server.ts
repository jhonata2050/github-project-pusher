import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ImportStats } from "./types";
import { pick } from "./mappers";
import { resolveUserId } from "./resolvers";

/** Importa clientes do WHMCS (tblclients export). */
export async function importClients(rows: Record<string, string>[], stats: ImportStats): Promise<void> {
  for (const row of rows) {
    const email = pick(row, ["email", "e-mail", "emailaddress", "mail", "clientemail", "email_address", "username", "login", "user", "email_address"]).toLowerCase();
    const whmcsId = pick(row, ["id", "userid", "clientid", "uid", "cid", "whmcsid", "client_id", "userid", "id_whmcs"]);
    
    if (!email && !whmcsId) {
      stats.clients.failed++;
      stats.errors.push("Linha ignorada: e-mail e ID WHMCS ausentes.");
      continue;
    }

    const fullName =
      pick(row, ["full_name", "name", "nome", "firstname", "first_name", "lastname", "last_name"]) ||
      `${pick(row, ["firstname", "first_name"])} ${pick(row, ["lastname", "last_name"])}`.trim() ||
      email.split("@")[0] || "Cliente Importado";

    const profile = {
      full_name: fullName || null,
      email,
      whmcs_id: whmcsId || null,
      company_name: pick(row, ["companyname", "company_name", "empresa"]) || null,
      tax_id: pick(row, ["tax_id", "taxid", "cpf", "cnpj", "documento"]) || null,
      phone: pick(row, ["phonenumber", "phone", "telefone"]) || null,
      address_line: pick(row, ["address1", "address_line", "endereco"]) || null,
      address_line2: pick(row, ["address2", "address_line2"]) || null,
      city: pick(row, ["city", "cidade"]) || null,
      state: pick(row, ["state", "estado"]) || null,
      postal_code: pick(row, ["postcode", "postal_code", "cep"]) || null,
      country: pick(row, ["country", "pais"]) || "BR",
      notes: "Importado do WHMCS" + (whmcsId ? ` (ID WHMCS: ${whmcsId})` : ""),
    };

    try {
      const existing = await resolveUserId(email, whmcsId);
      
      if (existing) {
        console.log(`[Import] Atualizando perfil existente ID: ${existing}`);
        // We only update if it's the SAME email or if it's explicitly linked by whmcs_id
        const { error } = await supabaseAdmin
          .from("profiles")
          .update(profile as any)
          .eq("id", existing);
        if (error) throw new Error(error.message);
        
        // Also ensure user_metadata in auth is updated if linked
        await supabaseAdmin.auth.admin.updateUserById(existing, {
          user_metadata: { full_name: fullName, whmcs_id: whmcsId }
        });

        stats.clients.updated++;
        continue;
      }

      // Double check in Auth by email to be absolutely sure before creating
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

      let userId = existingAuthUser?.id;

      if (!userId) {
        const { data: created, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
            password: crypto.randomUUID() + "Aa1!",
            user_metadata: { full_name: fullName, imported_from: "whmcs", whmcs_id: whmcsId },
          });

        if (authError || !created.user) {
          throw new Error(authError?.message ?? "Falha ao criar usuário no Auth");
        }
        userId = created.user.id;
        stats.clients.created++;
      } else {
        console.log(`[Import] Usuário Auth já existe (${userId}), vinculando/atualizando perfil.`);
        stats.clients.updated++;
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, ...profile } as any, { onConflict: "id" });
      
      if (profileError) throw new Error(profileError.message);

      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "client" }, { onConflict: "user_id,role" });
    } catch (e) {
      stats.clients.failed++;
      if (stats.errors.length < 50) {
        stats.errors.push(`Cliente ${email}: ${(e as Error).message}`);
      }
    }
  }
}
