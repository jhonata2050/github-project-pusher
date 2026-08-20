import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Validates a DirectAdmin SSO request and checks for administrative privilege escalation.
 */
export async function validateDASSORequest(
  userId: string,
  username: string,
  serverId: string
): Promise<{ isAdmin: boolean; targetUsername: string }> {
  // SECURITY: ALWAYS re-verify role directly from DB, ignoring JWT claims which might be stale/tampered
  const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (roleError) {
    console.error("[SSO-Security] Error checking roles:", roleError);
    throw new Error("Erro interno de segurança ao validar permissões.");
  }

  const cleanUsername = username.trim();

  if (!isAdmin) {
    // 2. For regular users, verify they OWN the service with this username on this server
    const { data: service, error } = await supabaseAdmin
      .from("services")
      .select("id, user_id, username, block_directadmin")
      .eq("user_id", userId)
      .eq("username", cleanUsername)
      .eq("server_id", serverId)
      .maybeSingle();

    if (error || !service) {
      console.error(`[Security-Alert] Unauthorized DA-SSO attempt by user ${userId} for username ${cleanUsername}`);
      await logSecurityEvent(userId, "unauthorized_sso_attempt", { username: cleanUsername, serverId });
      throw new Error("Acesso negado: Você não possui permissão para acessar este serviço ou o usuário informado é inválido.");
    }

    if (service.block_directadmin) {
      await logSecurityEvent(userId, "blocked_sso_attempt", { username: cleanUsername, serviceId: service.id });
      throw new Error("Seu acesso ao painel DirectAdmin foi bloqueado pelo administrador.");
    }

    // 3. Additional check: ensure the target username isn't a system one even if database says they own it (tamper check)
    // We strictly block any SSO into system accounts for non-admins.
    const restrictedUsernames = ["admin", "root", "superuser", "da_admin", "eqsa7232"];
    if (restrictedUsernames.includes(cleanUsername.toLowerCase())) {
      console.error(`[Security-Violation] User ${userId} attempted to SSO into restricted username ${cleanUsername} (DB Ownership Claimed)`);
      await logSecurityEvent(userId, "system_account_sso_attempt", { username: cleanUsername, serverId });
      throw new Error("Acesso negado: Tentativa de acesso a conta de sistema detectada.");
    }
  } else {
    // 4. For admins, verify they aren't accidentally trying to login as the root reseller or system accounts
    const restrictedUsernames = ["admin", "root", "superuser", "da_admin", "eqsa7232"];
    
    // We allow the main developer/admin ID to bypass for maintenance if needed, 
    // but block general admin escalation into the core reseller account.
    if (restrictedUsernames.includes(cleanUsername.toLowerCase()) && userId !== 'a6e63201-1901-4f5c-ab62-a83f6b55b8a6') {
      console.warn(`[Security-Warning] Admin ${userId} attempted SSO into a restricted system account: ${cleanUsername}`);
      throw new Error("Acesso negado: Administradores não podem acessar contas de sistema via SSO de cliente por segurança.");
    }
  }

  return { isAdmin: !!isAdmin, targetUsername: cleanUsername };
}

/**
 * Logs a sensitive security event.
 */
export async function logSecurityEvent(userId: string, action: string, metadata: any) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      category: "security",
      action,
      status: "warning",
      description: `Evento de segurança detectado: ${action}`,
      metadata,
    });
  } catch (e) {
    console.error("Failed to log security event:", e);
  }
}

