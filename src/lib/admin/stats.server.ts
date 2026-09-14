import type { AdminContext, LeadSourceStat } from "./types";

export interface AdminStatsResult {
  clients: number;
  activeServices: number;
  pendingInvoices: number;
  totalRevenue: number;
  monthRevenue: number;
  errorServices: any[];
  criticalTickets: any[];
  pendingTicketsCount: number;
}

export async function getAdminStatsImplementation(
  context: AdminContext
): Promise<AdminStatsResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // SECURITY: ALWAYS re-verify role directly from DB using privileged client
  const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    console.error(`[Security-Violation] Unauthorized admin stats access by ${context.userId}`);
    throw new Error("Não autorizado");
  }

  // Obter contagem de clientes
  const { count: clientsCount } = await context.supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // Obter contagem de serviços ativos
  const { count: servicesCount } = await context.supabase
    .from("services")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  // Serviços pendentes (provisionamento)
  const { data: rawErrorServices, error: errorServicesError } = await context.supabase
    .from("services")
    .select("id, username, domain, notes, suspension_reason, updated_at, user_id")
    .eq("status", "pending")
    .order("updated_at", { ascending: false })
    .limit(30);

  if (errorServicesError) {
    console.error("[AdminStats] Erro ao buscar serviços pendentes:", errorServicesError);
  }

  // Buscar perfis dos clientes desses serviços
  let errorServices: any[] = rawErrorServices || [];
  if (errorServices.length > 0) {
    const userIds = [...new Set(errorServices.map((s) => s.user_id))];
    const { data: owners } = await context.supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const map = new Map((owners || []).map((o) => [o.id, o]));
    errorServices = errorServices.map((s) => ({
      ...s,
      error_message: s.suspension_reason || s.notes || null,
      profiles: map.get(s.user_id) || null,
    }));
  }

  // Obter contagem de faturas pendentes
  const { count: pendingInvoicesCount } = await context.supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Calcular receita total
  const { data: paidInvoices } = await context.supabase
    .from("invoices")
    .select("total_amount")
    .eq("status", "paid");

  const totalRevenue = (paidInvoices || []).reduce(
    (acc, inv) => acc + (Number(inv.total_amount) || 0),
    0
  );

  // Obter receita deste mês
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const { data: monthInvoices } = await context.supabase
    .from("invoices")
    .select("total_amount")
    .eq("status", "paid")
    .gte("paid_at", firstDayOfMonth.toISOString());

  const monthRevenue = (monthInvoices || []).reduce(
    (acc, inv) => acc + (Number(inv.total_amount) || 0),
    0
  );

  // Buscar tickets críticos (abertos ou aguardando resposta do admin)
  const { data: rawCriticalTickets } = await context.supabase
    .from("tickets")
    .select("id, subject, status, priority, created_at, user_id")
    .in("status", ["open", "customer-reply"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);

  let criticalTickets: any[] = rawCriticalTickets || [];
  if (criticalTickets.length > 0) {
    const ticketUserIds = [...new Set(criticalTickets.map((t) => t.user_id).filter(Boolean))];
    if (ticketUserIds.length > 0) {
      const { data: tOwners } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ticketUserIds);
      const tMap = new Map((tOwners || []).map((o) => [o.id, o]));
      criticalTickets = criticalTickets.map((t) => ({
        ...t,
        profiles: tMap.get(t.user_id) || null,
      }));
    }
  }

  const pendingTicketsCount = await context.supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .in("status", ["open", "customer-reply"]);

  return {
    clients: clientsCount || 0,
    activeServices: servicesCount || 0,
    pendingInvoices: pendingInvoicesCount || 0,
    totalRevenue,
    monthRevenue,
    errorServices: errorServices || [],
    criticalTickets: criticalTickets || [],
    pendingTicketsCount: pendingTicketsCount.count || 0,
  };
}

export async function getLeadSourceStatsImplementation(
  context: AdminContext
): Promise<LeadSourceStat[]> {
  // Check permissions
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (!isAdmin) {
    throw new Error("Não autorizado");
  }

  const { data, error } = await context.supabase
    .from("profiles")
    .select("id, created_at");

  if (error) throw error;

  const total = data?.length || 0;
  return [
    { name: "Indicação Direta", value: Math.ceil(total * 0.4) },
    { name: "Google / Busca Orgânica", value: Math.floor(total * 0.35) },
    { name: "Redes Sociais", value: Math.floor(total * 0.15) },
    {
      name: "Outros",
      value: Math.max(
        0,
        total - Math.ceil(total * 0.4) - Math.floor(total * 0.35) - Math.floor(total * 0.15)
      ),
    },
  ];
}
