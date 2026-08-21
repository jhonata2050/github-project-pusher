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
      .select("id, user_id, username, status, block_directadmin")
      .eq("user_id", userId)
      .eq("username", cleanUsername)
      .eq("server_id", serverId)
      .maybeSingle();

    if (error || !service) {
      console.error(`[Security-Alert] Unauthorized DA-SSO attempt by user ${userId} for username ${cleanUsername}`);
      await logSecurityEvent(userId, "unauthorized_sso_attempt", { username: cleanUsername, serverId });
      
      // Notificar Admin via WhatsApp sobre tentativa de invasão/acesso indevido
      try {
        const { notifyAdminWhatsApp } = await import("./whatsapp.server");
        await notifyAdminWhatsApp(
          `🛑 *ALERTA DE SEGURANÇA*\n\nTentativa de acesso não autorizado ao DirectAdmin detectada!\n\n*Usuário Lovable:* ${userId}\n*Usuário DA Alvo:* ${cleanUsername}\n*Servidor:* ${serverId}\n\nO acesso foi BLOQUEADO automaticamente.`,
          "security_alerts"
        );
      } catch (e) {}

      throw new Error("Acesso negado: Você não possui permissão para acessar este serviço ou o usuário informado é inválido.");
    }

    if (service.status === 'suspended') {
      await logSecurityEvent(userId, "suspended_service_sso_attempt", { username: cleanUsername, serviceId: service.id });
      throw new Error("Seu serviço está suspenso. O acesso ao painel DirectAdmin não é permitido.");
    }


    if (service.block_directadmin) {
      await logSecurityEvent(userId, "blocked_sso_attempt", { username: cleanUsername, serviceId: service.id });
      throw new Error("Seu acesso ao painel DirectAdmin foi bloqueado pelo administrador.");
    }

    // 3. Additional check: ensure the target username isn't a system one even if database says they own it (tamper check)
    // We strictly block any SSO into system accounts for non-admins.
    const restrictedUsernames = ["admin", "root", "superuser", "da_admin", "eqsa7232", "reseller", "support", "system"];
    if (restrictedUsernames.includes(cleanUsername.toLowerCase())) {
      console.error(`[Security-Violation] User ${userId} attempted to SSO into restricted username ${cleanUsername} (DB Ownership Claimed)`);
      await logSecurityEvent(userId, "system_account_sso_attempt", { username: cleanUsername, serverId });
      throw new Error("Acesso negado: Tentativa de acesso a conta de sistema detectada.");
    }
  } else {
    // 4. For admins, verify they aren't accidentally trying to login as the root reseller or system accounts
    const restrictedUsernames = ["admin", "root", "superuser", "da_admin", "eqsa7232", "reseller", "support", "system"];
    
    // We allow the main developer/admin ID to bypass for maintenance if needed, 
    // but block general admin escalation into the core reseller account.
    if (restrictedUsernames.includes(cleanUsername.toLowerCase()) && userId !== 'a6e63201-1901-4f5c-ab62-a83f6b55b8a6') {
      console.warn(`[Security-Warning] Admin ${userId} attempted SSO into a restricted system account: ${cleanUsername}`);
      throw new Error("Acesso negado: Administradores não podem acessar contas de sistema via SSO de cliente por segurança.");
    }
  }

  // 5. Final validation: Check if user exists AND verify their type
  const { data: server } = await supabaseAdmin.from("servers").select("*").eq("id", serverId).single();
  if (!server) throw new Error("Servidor não encontrado.");

  // Import dynamic module safely
  const directAdminModule = await import("./directadmin.server");
  
  // Use callDA (exported) to verify the user configuration remotely
  const result = await (directAdminModule as any).callDA({
    hostname: server.hostname,
    apiUser: server.api_user ?? "",
    apiToken: server.api_token ?? "",
    command: 'CMD_API_SHOW_USER_CONFIG',
    params: { user: cleanUsername }
  });

  if (!result || result.error === '1' || !result.usertype) {
    console.error(`[Security-Alert] SSO validation failed: User ${cleanUsername} does not exist or access denied on DA server ${serverId}`);
    await logSecurityEvent(userId, "non_existent_da_user_sso_attempt", { username: cleanUsername, serverId });
    throw new Error("Erro de Segurança: O usuário do painel não existe no servidor ou o acesso foi negado.");
  }

  // CRITICAL: Block any SSO if the remote user is not a standard 'user'
  if (result.usertype !== 'user' && !isAdmin) {
    console.error(`[Security-CRITICAL] ESCALATION DETECTED: User ${userId} attempted to login to ${cleanUsername} which has level ${result.usertype}`);
    
    const { createSystemLog } = await import("./system-logs.server");
    await createSystemLog({
      category: 'security',
      level: 'critical',
      message: `TENTATIVA DE ESCALONAMENTO: Usuário tentou acessar conta com nível ${result.usertype} via SSO.`,
      actorId: userId,
      metadata: { username: cleanUsername, serverId, remoteType: result.usertype }
    });

    try {
      const { notifyAdminWhatsApp } = await import("./whatsapp.server");
      await notifyAdminWhatsApp(
        `🚨 *ALERTA CRÍTICO DE ESCALONAMENTO*\n\nTentativa de acesso administrativo via SSO bloqueada!\n\n*Usuário Lovable:* ${userId}\n*Usuário DA:* ${cleanUsername}\n*Nível Remoto:* ${result.usertype}\n\nO sistema impediu a sessão automaticamente.`,
        "security_critical"
      );
    } catch (e) {}

    throw new Error("Acesso negado: Falha crítica de segurança. Nível de permissão incompatível.");
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
