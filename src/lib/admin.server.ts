import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { getRequestHeader } from "@tanstack/react-start/server";
import { type BrandingSettings } from "./branding";

const DEFAULT_BRANDING: BrandingSettings = {
  logo_url: null,
  app_name: "Eqsam",
  primary_color: "oklch(0.88 0.19 128)",
  brand_color: "oklch(0.72 0.19 148)",
  favicon_url: null,
};

export async function getBrandingImplementation() {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!supabaseUrl || !supabaseKey) {
    console.warn("[Branding] Supabase environment variables are missing");
    return DEFAULT_BRANDING;
  }

  const supabasePublic = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabasePublic
    .from("system_settings")
    .select("value")
    .eq("key", "branding")
    .maybeSingle();

  if (error) {
    console.error("[Branding] Erro ao buscar configurações:", error);
    return DEFAULT_BRANDING;
  }
  
  if (!data) return DEFAULT_BRANDING;
  
  // Garantir que os dados lidos do banco preencham os campos faltantes com o padrão
  const value = data.value as unknown as BrandingSettings;
  return { 
    ...DEFAULT_BRANDING, 
    ...value,
    // Garante que logo_url null (ou ausente) não sobrescreva a inicial se houver erro na lógica do componente
    logo_url: value.logo_url || null 
  };
}

export async function updateBrandingImplementation(
  data: any,
  context: { supabase: SupabaseClient<Database>; userId: string; claims: any },
) {
  const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  
  if (roleError) {
    console.error("[Branding] Erro ao verificar permissões:", roleError);
    throw new Error(`Erro de permissão: ${roleError.message}`);
  }

  if (!isAdmin) {
    console.warn(`[Branding] Acesso negado para usuário ${context.userId}`);
    throw new Error("Acesso restrito a administradores.");
  }

  const { error } = await context.supabase.from("system_settings").upsert({
    key: "branding",
    value: data as unknown as Json,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const forwarded = getRequestHeader("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() || getRequestHeader("cf-connecting-ip") || null;
    const userAgent = getRequestHeader("user-agent")?.slice(0, 500) || null;
    const email = typeof context.claims.email === "string" ? context.claims.email : null;

    await supabaseAdmin.from("audit_logs").insert({
      category: "branding",
      action: "branding.update",
      status: "success",
      actor_id: context.userId,
      actor_email: email,
      description: `Branding atualizado: ${data.app_name}`,
      ip_address: ipAddress as string | null,
      user_agent: userAgent,
      metadata: { branding: data } as any,
    });
  } catch (e) {
    console.error("Erro ao logar alteração de branding:", e);
  }

  return { success: true };
}

export async function updateClientProfileImplementation(
  data: any,
  context: { supabase: SupabaseClient<Database>; userId: string },
) {
  // SECURITY: Check if admin
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (!isAdmin) {
    throw new Error("Acesso negado. Apenas administradores podem atualizar perfis de terceiros.");
  }

  const { id, ...updates } = data;

  const sanitizedUpdates: Record<string, any> = {};
  Object.entries(updates).forEach(([key, value]) => {
    sanitizedUpdates[key] = value === undefined ? null : value;
  });

  const { error } = await context.supabase
    .from("profiles")
    .update(sanitizedUpdates as any)
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}

export async function bulkDeleteClientsImplementation(
  clientIds: string[],
  context: { supabase: SupabaseClient<Database>; userId: string },
) {
  // 1. Verificar se quem está deletando é admin
  const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw new Error("Acesso negado. Apenas administradores podem excluir clientes.");
  }

  // 2. Importar o cliente admin para poder deletar de auth.users
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let deletedCount = 0;
  let failuresCount = 0;

  // 3. Deletar cada usuário via Auth Admin API
  // A exclusão em auth.users disparará o ON DELETE CASCADE nas tabelas vinculadas
  for (const id of clientIds) {
    // Não permite que o admin delete a si mesmo por aqui para evitar acidentes
    if (id === context.userId) {
      failuresCount++;
      continue;
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    
    if (error) {
      console.error(`Erro ao deletar usuário ${id}:`, error);
      failuresCount++;
    } else {
      deletedCount++;
    }
  }

  return {
    success: deletedCount > 0,
    deletedCount,
    failuresCount,
  };
}

export async function getAdminStatsImplementation(
  context: { supabase: SupabaseClient<Database>; userId: string }
) {
  // Verificar permissões
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (!isAdmin) {
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
  const { data: errorServices } = await context.supabase
    .from("services")
    .select("id, username, domain, error_message, updated_at, user_id")
    .eq("status", "pending")
    .limit(5);

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
  
  const totalRevenue = (paidInvoices || []).reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0);

  // Obter receita deste mês
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const { data: monthInvoices } = await context.supabase
    .from("invoices")
    .select("total_amount")
    .eq("status", "paid")
    .gte("paid_at", firstDayOfMonth.toISOString());

  const monthRevenue = (monthInvoices || []).reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0);

  // Buscar tickets críticos (abertos ou aguardando resposta do admin)
  const { data: criticalTickets } = await context.supabase
    .from("tickets")
    .select("id, subject, status, priority, created_at, profiles(full_name)")
    .in("status", ["open", "customer-reply"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);

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
    pendingTicketsCount: pendingTicketsCount.count || 0
  };
}

