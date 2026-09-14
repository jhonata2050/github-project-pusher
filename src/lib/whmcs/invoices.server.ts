import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ImportStats } from "./types";
import { pick, toDate, toNumber, INVOICE_STATUS_MAP } from "./mappers";
import { resolveUserId } from "./resolvers";

/** Importa faturas do WHMCS (tblinvoices export). */
export async function importInvoices(rows: Record<string, string>[], stats: ImportStats): Promise<void> {
  for (const row of rows) {
    const email = pick(row, ["email", "client_email", "e-mail", "user_email", "mail", "clientemail", "email_address", "username", "login", "user", "email_address"]).toLowerCase();
    const whmcsClientId = pick(row, ["userid", "clientid", "uid", "client_id", "user_id", "cid", "whmcsid", "client_id", "id_whmcs"]);
    const invoiceWhmcsId = pick(row, ["id", "invoiceid", "invoicenum", "number", "whmcsid", "invoice_id", "id_whmcs"]);

    try {
      const userId = await resolveUserId(email, whmcsClientId);
      if (!userId) {
        const fields = Object.keys(row).join(", ");
        throw new Error(`não foi possível associar a fatura ao cliente (e-mail: ${email || "vazio"}, ID WHMCS: ${whmcsClientId || "vazio"}). Campos disponíveis no CSV: ${fields}. Verifique se o cliente foi importado primeiro.`);
      }

      const total = toNumber(pick(row, ["total", "valor", "amount", "totalamount"]));
      const subtotal = toNumber(pick(row, ["subtotal"])) || total;
      const statusRaw = pick(row, ["status", "invoicestatus"]).toLowerCase();
      const status = INVOICE_STATUS_MAP[statusRaw] ?? "unpaid";
      
      const dueDate = toDate(pick(row, ["duedate", "duedate", "vencimento", "date"])) ?? new Date().toISOString();
      const paidAt = toDate(pick(row, ["datepaid", "paidat", "datapagamento", "datepaid"]));
      const method = pick(row, ["paymentmethod", "paymentmethod", "metodo", "gateway"]);

      const { error } = await (supabaseAdmin.from("invoices") as any).upsert({
        user_id: userId,
        whmcs_id: invoiceWhmcsId || null,
        subtotal,
        total_amount: total,
        tax_amount: toNumber(pick(row, ["tax", "taxa", "taxamount"])),
        discount_amount: toNumber(pick(row, ["credit", "desconto", "discount", "discountamount"])),
        status: status as any,
        due_date: dueDate,
        paid_at: paidAt,
        payment_method: method || null,
        notes: `Importado do WHMCS (ID: ${invoiceWhmcsId || "?"})`,
      }, { onConflict: 'whmcs_id' });

      if (error) throw new Error(error.message);
      stats.invoices.created++;

    } catch (e) {
      stats.invoices.failed++;
      if (stats.errors.length < 50) {
        stats.errors.push(`Fatura ${invoiceWhmcsId || email}: ${(e as Error).message}`);
      }
    }
  }
}
