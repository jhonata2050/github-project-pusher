import { callDA, createDAAccount, suspendDAAccount, deleteDAAccount, getDASession } from "./directadmin.server";
export class DirectAdminProvider {
    serverId;
    constructor(serverId) {
        this.serverId = serverId;
    }
    async createAccount(details) {
        return createDAAccount(this.serverId, details);
    }
    async suspendAccount(username) {
        return suspendDAAccount(this.serverId, username);
    }
    async unsuspendAccount(username) {
        // No DirectAdmin, suspend/unsuspend é o mesmo comando com parâmetros diferentes
        const { data: server } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin
            .from("servers")
            .select("*")
            .eq("id", this.serverId)
            .single();
        if (!server)
            throw new Error("Servidor não encontrado");
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
    async deleteAccount(username) {
        return deleteDAAccount(this.serverId, username);
    }
    async getAccount(username) {
        const { data: server } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin
            .from("servers")
            .select("*")
            .eq("id", this.serverId)
            .single();
        if (!server)
            throw new Error("Servidor não encontrado");
        return await callDA({
            hostname: server.hostname,
            apiUser: server.api_user ?? "",
            apiToken: server.api_token ?? "",
            command: 'CMD_API_SHOW_USER_CONFIG',
            params: { user: username }
        });
    }
    async getAccountStatus(username) {
        const config = await this.getAccount(username);
        if (config && config['suspended'] === 'yes')
            return 'suspended';
        return 'active';
    }
    async generateClientLogin(username, redirectUrl) {
        // A função getDASession já implementa a segurança de Login Keys do DirectAdmin
        // que gera um acesso específico para o usuário, nunca admin.
        return getDASession(this.serverId, username, redirectUrl);
    }
}
