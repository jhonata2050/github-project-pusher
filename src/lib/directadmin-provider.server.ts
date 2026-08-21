import { HostingProvider } from "./hosting-provider";
import { callDA, createDAAccount, suspendDAAccount, deleteDAAccount, checkDAUserExists, getDASession } from "./directadmin.server";

export class DirectAdminProvider implements HostingProvider {
  private serverId: string;

  constructor(serverId: string) {
    this.serverId = serverId;
  }

  async createAccount(details: { username: string; email: string; domain: string; package: string }) {
    return createDAAccount(this.serverId, details);
  }

  async suspendAccount(username: string) {
    return suspendDAAccount(this.serverId, username);
  }

  async unsuspendAccount(username: string) {
    // No DirectAdmin, suspend/unsuspend é o mesmo comando com parâmetros diferentes
    const { data: server } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin
      .from("servers")
      .select("*")
      .eq("id", this.serverId)
      .single();

    if (!server) throw new Error("Servidor não encontrado");

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

  async deleteAccount(username: string) {
    return deleteDAAccount(this.serverId, username);
  }

  async getAccount(username: string) {
    const { data: server } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin
      .from("servers")
      .select("*")
      .eq("id", this.serverId)
      .single();

    if (!server) throw new Error("Servidor não encontrado");

    return await callDA({
      hostname: server.hostname,
      apiUser: server.api_user ?? "",
      apiToken: server.api_token ?? "",
      command: 'CMD_API_SHOW_USER_CONFIG',
      params: { user: username }
    });
  }

  async getAccountStatus(username: string) {
    const config = await this.getAccount(username) as Record<string, any>;
    if (config && config['suspended'] === 'yes') return 'suspended';
    return 'active';
  }

  async generateClientLogin(username: string, redirectUrl?: string) {
    // A função getDASession já implementa a segurança de Login Keys do DirectAdmin
    // que gera um acesso específico para o usuário, nunca admin.
    return getDASession(this.serverId, username, redirectUrl);
  }
}
