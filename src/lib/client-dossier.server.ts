import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Limite padrão por coleção: evita trazer centenas de linhas por cliente antigo.
const RECENT_LIMIT = 50;

export async function fetchClientDossier(
  supabase: SupabaseClient<Database>,
  userId: string,
  clientId: string,
) {
  const { data: isStaff, error: roleError } = await supabase.rpc("is_staff", {
    _user_id: userId,
  });

  if (roleError) {
    console.warn("[fetchClientDossier] is_staff check warning:", roleError.message);
  }

  // 1. Buscar serviços do cliente usando supabaseAdmin para evitar restrições de RLS
  let servicesData: any[] = [];
  try {
    const { data: services, error: sErr } = await supabaseAdmin
      .from("services")
      .select(`
        id, 
        status, 
        domain, 
        username, 
        password,
        billing_cycle, 
        next_due_date, 
        server_id, 
        product_id, 
        created_at, 
        notes,
        products(id, name, product_type), 
        servers(id, hostname, name)
      `)
      .eq("user_id", clientId)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT);

    if (sErr) {
      console.warn("[fetchClientDossier] services query warning:", sErr.message);
    }

    const allServices = services || [];
    const serviceIds = allServices.map((s: any) => s.id);

    // 2. Buscar instâncias VPS do banco de forma resiliente
    const { data: vpsData } = await supabaseAdmin
      .from("vps_instances")
      .select("id, user_id, external_id, name, ip_address, status, region, os_template");

    const allVps = vpsData || [];

    servicesData = allServices.map((s: any) => {
      // Encontrar VPS vinculada por nome, IP, hostname ou user_id
      const matchedVps = allVps.filter((v: any) => 
        (s.domain && (s.domain === v.name || s.domain === v.ip_address)) ||
        (s.vps_hostname && s.vps_hostname === v.name) ||
        (s.products?.product_type === 'vps' && v.user_id === clientId)
      );

      return {
        ...s,
        vps_instances: matchedVps,
      };
    });
  } catch (err) {
    console.warn("[fetchClientDossier] Failed to fetch services:", err);
    servicesData = [];
  }

  const [profile, invoices, tickets, emailLogs] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("id", clientId).maybeSingle(),
    supabaseAdmin
      .from("invoices")
      .select("id, status, total_amount, subtotal, tax_amount, discount_amount, due_date, paid_at, payment_method, created_at")
      .eq("user_id", clientId)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
    supabaseAdmin
      .from("tickets")
      .select("id, subject, status, priority, created_at, updated_at")
      .eq("user_id", clientId)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
    supabaseAdmin
      .from("email_logs")
      .select("id, to_email, subject, template_name, status, created_at")
      .eq("user_id", clientId)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
  ]);

  return {
    ...(profile.data ?? { id: clientId }),
    invoices: invoices.data ?? [],
    services: servicesData,
    tickets: tickets.data ?? [],
    email_logs: emailLogs.data ?? [],
  };
}
