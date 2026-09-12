import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callDA } from "./transport.server";
import { generateStrongPassword } from "./types";

/**
 * DirectAdmin Account Lifecycle Services:
 * Create, Suspend, Unsuspend, Delete, Existence Check, and Package Modification.
 */

export async function createDAAccount(serverId: string, details: {
  username: string;
  email: string;
  domain: string;
  package: string;
  password?: string | undefined;
}) {
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (error || !server) throw new Error("Servidor não encontrado");

  // Senha informada ou gerada automaticamente
  const daPassword = details.password || generateStrongPassword(24);

  const result = await callDA({
    hostname: server.hostname,
    apiUser: server.api_user ?? "",
    apiToken: server.api_token ?? "",
    command: 'CMD_API_ACCOUNT_USER',
    method: 'POST',
    params: {
      action: 'create',
      add: 'Submit',
      username: details.username,
      email: details.email,
      passwd: daPassword,
      passwd2: daPassword,
      domain: details.domain,
      package: details.package,
      ip: server.ip_address || '',
      notify: 'no'
    }
  });

  // Retornamos a senha gerada para que o chamador possa salvar na tabela 'services'
  return { ...result, daPassword };
}

export async function suspendDAAccount(serverId: string, username: string) {
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (error || !server) throw new Error("Servidor não encontrado");

  return await callDA({
    hostname: server.hostname,
    apiUser: server.api_user ?? "",
    apiToken: server.api_token ?? "",
    command: 'CMD_API_SELECT_USERS',
    method: 'POST',
    params: {
      location: 'users',
      suspend: 'Suspend',
      select0: username
    }
  });
}

export async function unsuspendDAAccount(serverId: string, username: string) {
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (error || !server) throw new Error("Servidor não encontrado");

  return await callDA({
    hostname: server.hostname,
    apiUser: server.api_user ?? "",
    apiToken: server.api_token ?? "",
    command: 'CMD_API_SELECT_USERS',
    method: 'POST',
    params: {
      location: 'users',
      suspend: 'Unsuspend',
      select0: username
    }
  });
}

export async function deleteDAAccount(serverId: string, username: string) {
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (error || !server) throw new Error("Servidor não encontrado");

  return await callDA({
    hostname: server.hostname,
    apiUser: server.api_user ?? "",
    apiToken: server.api_token ?? "",
    command: 'CMD_API_SELECT_USERS',
    method: 'POST',
    params: {
      location: 'users',
      delete: 'Delete',
      select0: username
    }
  });
}

export async function checkDAUserExists(serverId: string, username: string, serviceId?: string): Promise<boolean> {
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (error || !server) return false;

  try {
    const result = await callDA({
      hostname: server.hostname,
      apiUser: server.api_user ?? "",
      apiToken: server.api_token ?? "",
      command: 'CMD_API_SHOW_USER_CONFIG',
      params: { user: username.trim() }
    });

    const resObj = result as Record<string, any>;
    if (resObj && (resObj['error'] === '1' || resObj['error'] === 1)) {
      const details = String(resObj['details'] || resObj['text'] || "");
      if (details.includes("Cannot show user") || details.includes("does not exist")) {
        return false;
      }
      return false;
    }
    
    // Além de existir, verificamos se o tipo é estritamente 'user' para clientes
    // Se o resultado contiver usertype=reseller ou admin, e não for uma consulta de admin, podemos sinalizar
    if (resObj && resObj['usertype'] && resObj['usertype'] !== 'user' && !username.toLowerCase().includes('admin')) {
      console.warn(`[DA-Security-Warning] Usuário ${username} detectado com nível ${resObj['usertype']} no servidor ${server.hostname}`);
    }

    return !!(resObj && (resObj['username'] || resObj['email'] || resObj['error'] === '0'));
  } catch (e) {
    const errorStr = String(e);
    
    // Conflitos ou falta de permissão
    if (errorStr.includes("You don't have control over that user") || errorStr.includes("Cannot show user")) {
      // Se caímos aqui, o usuário existe mas não pertence a este token API (CONFLITO DE DOMÍNIO/USUÁRIO)
      if (serviceId) {
        console.error(`[DA-Security-Conflict] Usuário ${username} já existe em outro revendedor no servidor ${server.hostname}`);
        
        const { createSystemLog } = await import("../system-logs.server");
        const { data: service } = await supabaseAdmin.from("services").select("user_id").eq("id", serviceId).single();
        
        await createSystemLog({
          category: 'directadmin',
          level: 'critical',
          message: `CONFLITO DE DOMÍNIO: O usuário/domínio ${username} já existe no servidor ${server.hostname} sob outro controle.`,
          serviceId,
          actorId: service?.user_id,
          metadata: { serverId, username, serverHostname: server.hostname, error: errorStr }
        });

        // Bloqueio imediato do serviço
        await supabaseAdmin.from("services").update({
          status: 'suspended',
          suspension_reason: "BLOCK_DIRECTADMIN: Conflito de domínio detectado no servidor. Por favor, contate o suporte para resolução.",
          notes: "BLOQUEIO DE SEGURANÇA: Conflito de domínio detectado no servidor. Por favor, contate o suporte para resolução.",
          updated_at: new Date().toISOString()
        }).eq("id", serviceId);
        
        // Notificar via WhatsApp sobre o conflito
        const { notifyAdminWhatsApp } = await import("../whatsapp.server");
        await notifyAdminWhatsApp(
          `⚠️ *CONFLITO DE SEGURANÇA (DA)*\n\n*Domínio:* ${username}\n*Servidor:* ${server.hostname}\n*Ação:* Serviço suspenso automaticamente para evitar acesso indevido.\n\nVerifique o painel de auditoria.`,
          "security_conflict"
        );
      }
      return false;
    }
    
    console.error(`[DA-Security] Erro ao verificar existência do usuário ${username}:`, e);
    return false;
  }
}

export async function modifyDAUserPackage(serverId: string, username: string, newPackage: string) {
  const { data: server, error } = await supabaseAdmin
    .from('servers')
    .select('*')
    .eq('id', serverId)
    .single();

  if (error || !server) throw new Error('Servidor DirectAdmin não encontrado');

  const result = await callDA({
    hostname: server.hostname,
    apiUser: server.api_user,
    apiToken: server.api_token,
    command: 'CMD_API_MODIFY_USER',
    method: 'POST',
    params: {
      action: 'package',
      user: username,
      package: newPackage,
    },
  });

  return result;
}
