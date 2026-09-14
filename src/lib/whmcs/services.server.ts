import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ImportStats } from "./types";
import { pick, toDate, CYCLE_MAP, SERVICE_STATUS_MAP } from "./mappers";
import { resolveUserId, resolveProductId } from "./resolvers";

/** Importa serviços/hospedagens do WHMCS (tblhosting export). */
export async function importServices(rows: Record<string, string>[], stats: ImportStats): Promise<void> {
  for (const row of rows) {
    const email = pick(row, ["email", "client_email", "e-mail", "user_email", "mail", "clientemail", "email_address", "username", "login", "user", "email_address"]).toLowerCase();
    const whmcsClientId = pick(row, ["userid", "clientid", "uid", "client_id", "user_id", "cid", "whmcsid", "client_id", "id_whmcs"]);
    const serviceWhmcsId = pick(row, ["id", "serviceid", "hostingid", "whmcsid", "service_id", "id_whmcs"]);

    try {
      const userId = await resolveUserId(email, whmcsClientId);
      if (!userId) {
        const fields = Object.keys(row).join(", ");
        throw new Error(`não foi possível associar o serviço ao cliente (e-mail: ${email || "vazio"}, ID WHMCS: ${whmcsClientId || "vazio"}). Campos disponíveis no CSV: ${fields}. Verifique se o cliente foi importado primeiro.`);
      }

      const productName = pick(row, ["product", "produto", "packagename", "productname", "package"]);
      const productId = await resolveProductId(productName || "Plano Importado");
      if (!productId) throw new Error("não foi possível resolver o produto");

      const cycleRaw = pick(row, ["billingcycle", "ciclo", "billing_cycle"]).toLowerCase();
      const cycle = CYCLE_MAP[cycleRaw] ?? "monthly";
      
      const statusRaw = pick(row, ["status", "domainstatus", "state", "service_status"]).toLowerCase();
      const status = SERVICE_STATUS_MAP[statusRaw] ?? "active";

      const domain = pick(row, ["domain", "dominio", "host", "hostname"]);
      const username = pick(row, ["username", "usuario", "login", "user", "username"]);
      const nextDue = toDate(pick(row, ["nextduedate", "vencimento", "nextdue"]));
      // Senha do serviço no WHMCS (não deve sobrescrever a senha do perfil Lovable)
      const servicePassword = pick(row, ["password", "senha", "passwd"]);

      const { error } = await (supabaseAdmin.from("services") as any).upsert({
        user_id: userId,
        product_id: productId,
        whmcs_id: serviceWhmcsId || null,
        domain: domain || null,
        username: username || null,
        password: servicePassword || null, // Armazenado no serviço para o DirectAdmin
        server_id: null,
        billing_cycle: cycle as any,
        status: status as any,
        next_due_date: nextDue,
      }, { onConflict: 'whmcs_id' });

      if (error) throw new Error(error.message);
      stats.services.created++;

    } catch (e) {
      stats.services.failed++;
      if (stats.errors.length < 50) {
        stats.errors.push(`Serviço ${serviceWhmcsId || email}: ${(e as Error).message}`);
      }
    }
  }
}
