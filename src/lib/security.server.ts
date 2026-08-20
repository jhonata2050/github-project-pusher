import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyAdminWhatsApp } from "./whatsapp.server";

/**
 * Validates a DirectAdmin SSO request and checks for administrative privilege escalation.
 */
export async function validateDASSORequest(
  userId: string,
  username: string,
  serverId: string
): Promise<{ isAdmin: boolean; targetUsername: string }> {
  // 1. Check if the requesting user is a system admin
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

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
      throw new Error("Acesso negado: Você não possui permissão para acessar este serviço.");
    }

    if (service.block_directadmin) {
      throw new Error("Seu acesso ao painel DirectAdmin foi bloqueado pelo administrador.");
    }
  } else {
    // 3. For admins, verify they aren't accidentally trying to login as 'admin' or 'root' via customer SSO
    const restrictedUsernames = ["admin", "root", "superuser", "da_admin"];
    if (restrictedUsernames.includes(cleanUsername.toLowerCase())) {
      console.warn(`[Security-Warning] Admin ${userId} attempted SSO into a restricted system account: ${cleanUsername}`);
      // Note: We might allow this if the user IS a system admin, but generally, 
      // SSO links should be for customer accounts to avoid sharing root-level one-time links.
    }
  }

  return { isAdmin: !!isAdmin, targetUsername: cleanUsername };
}

/**
 * Logs a sensitive security event.
 */
export async function logSecurityEvent(userId: string, action: string, metadata: any) {
  await supabaseAdmin.from("audit_logs").insert({
    user_id: userId,
    category: "security",
    action,
    status: "warning",
    metadata,
  });
}
