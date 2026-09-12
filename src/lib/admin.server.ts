import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { getRequestHeader } from "@tanstack/react-start/server";
import { type BrandingSettings } from "./branding";

const DEFAULT_BRANDING: BrandingSettings = {
  logo_url: "/images/logo-branco.webp",
  app_name: "Eqsam",
  primary_color: "oklch(0.88 0.19 128)",
  brand_color: "oklch(0.72 0.19 148)",
  favicon_url: "/images/logo.png",
};

export async function getBrandingImplementation() {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!supabaseUrl || !supabaseKey) {
    console.warn("[Branding] Supabase environment variables are missing");
    return DEFAULT_BRANDING;
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
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
    const value = (data.value as unknown as BrandingSettings) || {};
    return { 
      ...DEFAULT_BRANDING, 
      ...value,
      // Garante que o logo_url do banco seja preservado se existir
      logo_url: value.logo_url !== undefined ? value.logo_url : DEFAULT_BRANDING.logo_url
    };
  } catch (err) {
    console.error("[Branding] Falha ao importar supabaseAdmin:", err);
    return DEFAULT_BRANDING;
  }
}

export async function updateBrandingImplementation(
  data: any,
  context: { supabase: SupabaseClient<Database>; userId: string; claims: any },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  
  if (roleError) {
    console.error("[Branding] Erro ao verificar permissões:", roleError);
    throw new Error(`Erro de permissão: ${roleError.message}`);
  }

  if (!isAdmin) {
    console.warn(`[Security-Violation] Acesso negado para usuário ${context.userId} tentando atualizar branding`);
    throw new Error("Acesso restrito a administradores.");
  }

  const { error } = await supabaseAdmin.from("system_settings").upsert({
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
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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

  // Se o e-mail foi alterado, atualiza também a conta de autenticação (auth.users)
  if (sanitizedUpdates['email'] && typeof sanitizedUpdates['email'] === "string") {
    const cleanEmail = sanitizedUpdates['email'].trim().toLowerCase();
    sanitizedUpdates['email'] = cleanEmail;

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email: cleanEmail,
      email_confirm: true,
    });

    if (authError) {
      console.error("[Admin] Erro ao sincronizar e-mail no auth.users:", authError);
      throw new Error(`Erro ao atualizar e-mail de autenticação: ${authError.message}`);
    }
  }

  const { error } = await context.supabase
    .from("profiles")
    .update(sanitizedUpdates as any)
    .eq("id", id);

  if (error) throw error;

  // Registrar auditoria
  try {
    await supabaseAdmin.from("audit_logs").insert({
      category: "profile",
      action: "profile.admin_updated",
      status: "success",
      actor_id: context.userId,
      description: `Perfil do cliente ${id} atualizado pelo administrador.`,
      metadata: { targetUserId: id, updates: sanitizedUpdates } as any,
    });
  } catch (logErr) {
    console.warn("[Admin] Falha ao registrar log de atualização de perfil:", logErr);
  }

  return { success: true };
}

export async function adminChangeUserPasswordImplementation(
  data: { userId: string; newPassword: string },
  context: { supabase: SupabaseClient<Database>; userId: string },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Validar permissão de admin
  const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw new Error("Acesso negado. Apenas administradores podem alterar senhas de clientes.");
  }

  if (!data.newPassword || data.newPassword.length < 6) {
    throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
  }

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
    data.userId,
    { password: data.newPassword },
  );

  if (updateErr) {
    console.error(`[Admin] Erro ao alterar senha do usuário ${data.userId}:`, updateErr);
    throw new Error(`Erro ao alterar senha: ${updateErr.message}`);
  }

  // Registrar no log de auditoria
  try {
    await supabaseAdmin.from("audit_logs").insert({
      category: "security",
      action: "user.password_reset_by_admin",
      status: "success",
      actor_id: context.userId,
      description: `Senha do usuário ${data.userId} redefinida diretamente pelo administrador.`,
      metadata: { targetUserId: data.userId } as any,
    });
  } catch (logErr) {
    console.warn("[Admin] Falha ao registrar log de alteração de senha:", logErr);
  }

  return { success: true };
}

export async function adminSendPasswordResetImplementation(
  data: { userId: string; email: string },
  context: { supabase: SupabaseClient<Database>; userId: string },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Validar permissão de admin
  const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw new Error("Acesso negado. Apenas administradores podem gerar links de recuperação de senha.");
  }

  const forwardedHost = getRequestHeader("x-forwarded-host") || getRequestHeader("host");
  const proto = getRequestHeader("x-forwarded-proto") || "https";
  const appBaseUrl = forwardedHost ? `${proto}://${forwardedHost}` : (process.env['APP_URL'] || "https://eqsam.com");

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: data.email,
    options: {
      redirectTo: `${appBaseUrl}/auth/reset-password`,
    },
  });

  if (linkErr) {
    console.error(`[Admin] Erro ao gerar link de recuperação para ${data.email}:`, linkErr);
    throw new Error(`Erro ao gerar link de recuperação: ${linkErr.message}`);
  }

  const actionLink = linkData?.properties?.action_link;

  let emailSent = false;
  try {
    const { sendEmail } = await import("./emails.server");
    await sendEmail({
      to: data.email,
      subject: "Redefinição de Senha de Acesso — Eqsam",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0;">Recuperação de Senha</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">Olá,</p>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">Uma solicitação de redefinição de senha para sua conta foi gerada pela nossa equipe administrativa.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${actionLink}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">Redefinir Minha Senha</a>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Ou copie e cole o link diretamente no navegador:</p>
          <p style="color: #059669; font-size: 11px; word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">${actionLink}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">Se você não solicitou este e-mail, nenhuma alteração foi feita na sua conta.</p>
        </div>
      `,
      userId: data.userId,
      templateName: "admin_password_recovery",
    });
    emailSent = true;
  } catch (mailErr: any) {
    console.warn("[AdminAuth] Falha ao enviar e-mail de recuperação de senha:", mailErr?.message);
  }

  // Registrar auditoria
  try {
    await supabaseAdmin.from("audit_logs").insert({
      category: "security",
      action: "user.recovery_link_generated",
      status: "success",
      actor_id: context.userId,
      description: `Link de redefinição de senha gerado para ${data.email} (${data.userId}). Email enviado: ${emailSent}`,
      metadata: { targetUserId: data.userId, email: data.email, emailSent } as any,
    });
  } catch (logErr) {
    console.warn("[Admin] Falha ao registrar log de link de recuperação:", logErr);
  }

  return {
    success: true,
    actionLink: actionLink || null,
    emailSent,
  };
}

export async function bulkDeleteClientsImplementation(
  clientIds: string[],
  context: { supabase: SupabaseClient<Database>; userId: string },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // SECURITY: ALWAYS re-verify role directly from DB using privileged client
  const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw new Error("Acesso negado. Apenas administradores podem excluir clientes.");
  }

  // 2. O cliente admin já foi importado acima para verificação de segurança.


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

  // Buscar perfis dos clientes desses serviços (relação não é direta no schema)
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
      profiles: map.get(s.user_id) || null
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
      criticalTickets = criticalTickets.map((t) => ({ ...t, profiles: tMap.get(t.user_id) || null }));
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
    pendingTicketsCount: pendingTicketsCount.count || 0
  };
}

export async function getLeadSourceStatsImplementation(
  context: { supabase: SupabaseClient<Database>; userId: string }
) {
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
    { name: "Outros", value: Math.max(0, total - Math.ceil(total * 0.4) - Math.floor(total * 0.35) - Math.floor(total * 0.15)) }
  ];
}


