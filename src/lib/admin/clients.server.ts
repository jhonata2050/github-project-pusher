import { getRequestHeader } from "@tanstack/react-start/server";
import type { AdminContext, AdminChangePasswordData, AdminSendPasswordResetData } from "./types";

export async function updateClientProfileImplementation(
  data: any,
  context: AdminContext
): Promise<{ success: boolean }> {
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
  if (sanitizedUpdates["email"] && typeof sanitizedUpdates["email"] === "string") {
    const cleanEmail = sanitizedUpdates["email"].trim().toLowerCase();
    sanitizedUpdates["email"] = cleanEmail;

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
  data: AdminChangePasswordData,
  context: AdminContext
): Promise<{ success: boolean }> {
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
    { password: data.newPassword }
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
  data: AdminSendPasswordResetData,
  context: AdminContext
): Promise<{ success: boolean; actionLink: string | null; emailSent: boolean }> {
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
  const appBaseUrl = forwardedHost ? `${proto}://${forwardedHost}` : (process.env["APP_URL"] || "https://eqsam.com");

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
    const { sendEmail } = await import("../emails.server");
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
  context: AdminContext
): Promise<{ success: boolean; deletedCount: number; failuresCount: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // SECURITY: ALWAYS re-verify role directly from DB using privileged client
  const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw new Error("Acesso negado. Apenas administradores podem excluir clientes.");
  }

  let deletedCount = 0;
  let failuresCount = 0;

  // Deletar cada usuário via Auth Admin API (disparando ON DELETE CASCADE nas tabelas vinculadas)
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
