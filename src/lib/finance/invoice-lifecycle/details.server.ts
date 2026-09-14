import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function fetchInvoiceDetails(
  supabaseClient: any,
  userId: string,
  id: string
) {
  // 1. Tenta buscar usando o cliente autenticado
  let { data: invoice } = await supabaseClient
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .maybeSingle();

  // 2. Fallback com supabaseAdmin se não encontrado
  if (!invoice) {
    const { data: adminInvoice } = await supabaseAdmin
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("id", id)
      .maybeSingle();
    invoice = adminInvoice;
  }

  if (invoice) {
    if (invoice.user_id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", invoice.user_id)
        .maybeSingle();
      return { ...invoice, profiles: profile || null };
    }
    return invoice;
  }

  throw new Error("Fatura não encontrada ou acesso negado");
}
