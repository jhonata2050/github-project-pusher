import { HostingProvider } from "./hosting-provider";
import { DirectAdminProvider } from "./directadmin-provider.server";

export async function getHostingProvider(serverId: string): Promise<HostingProvider> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  const { data: server, error } = await supabaseAdmin
    .from("servers")
    .select("type")
    .eq("id", serverId)
    .single();

  if (error || !server) {
    throw new Error("Servidor não encontrado ao instanciar provedor.");
  }

  // Por padrão, se não especificado, tratamos como DirectAdmin para compatibilidade
  const serverType = server.type || 'directadmin';

  switch (serverType.toLowerCase()) {
    case 'directadmin':
      return new DirectAdminProvider(serverId);
    default:
      throw new Error(`Provedor de hospedagem '${serverType}' ainda não implementado.`);
  }
}
