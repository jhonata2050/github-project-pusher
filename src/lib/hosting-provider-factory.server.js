import { DirectAdminProvider } from "./directadmin-provider.server";
export async function getHostingProvider(serverId) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: server, error } = await supabaseAdmin
        .from("servers")
        .select("id, server_type")
        .eq("id", serverId)
        .maybeSingle();
    if (error) {
        throw new Error(`Erro ao buscar servidor: ${error.message}`);
    }
    if (!server) {
        throw new Error("Servidor não encontrado ao instanciar provedor.");
    }
    // Por padrão, se não especificado, tratamos como DirectAdmin para compatibilidade
    const serverType = server.server_type || 'directadmin';
    switch (serverType.toLowerCase()) {
        case 'directadmin':
            return new DirectAdminProvider(serverId);
        default:
            throw new Error(`Provedor de hospedagem '${serverType}' ainda não implementado.`);
    }
}
