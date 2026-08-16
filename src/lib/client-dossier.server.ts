import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

// Limite padrão por coleção: evita trazer centenas de linhas por cliente antigo.
const RECENT_LIMIT = 25;

export async function fetchClientDossier(
  supabase: SupabaseClient<Database>,
  userId: string,
  clientId: string,
) {
  const { data: isStaff, error: roleError } = await supabase.rpc("is_staff", {
    _user_id: userId,
  });

  if (roleError) throw roleError;
  if (!isStaff) {
    throw new Error("Acesso restrito à equipe administrativa.");
  }

  const [profile, invoices, services, tickets, emailLogs] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", clientId).single(),
    supabase
      .from("invoices")
      .select("id, status, total_amount, subtotal, tax_amount, discount_amount, due_date, paid_at, payment_method, created_at")
      .eq("user_id", clientId)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
    supabase
      .from("services")
      .select("id, status, domain, username, billing_cycle, next_due_date, server_id, product_id, auto_renew, created_at, products(name)")
      .eq("user_id", clientId)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
    supabase
      .from("tickets")
      .select("id, subject, status, priority, created_at, updated_at")
      .eq("user_id", clientId)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
    supabase
      .from("email_logs")
      .select("id, to_email, subject, template_name, status, created_at")
      .eq("user_id", clientId)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
  ]);

  const error = profile.error || invoices.error || services.error || tickets.error || emailLogs.error;
  if (error) throw error;

  return {
    ...profile.data,
    invoices: invoices.data ?? [],
    services: services.data ?? [],
    tickets: tickets.data ?? [],
    email_logs: emailLogs.data ?? [],
  };
}
