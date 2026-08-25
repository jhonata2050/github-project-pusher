
import { supabaseAdmin } from "./integrations/supabase/client.server";
import { getDASession } from "./lib/directadmin.server";

async function testSSO() {
  const serviceId = 'e86fcd34-47f0-4929-b109-82d0cfe01f62';
  const { data: service } = await supabaseAdmin
    .from("services")
    .select("*, servers(*)")
    .eq("id", serviceId)
    .single();

  if (!service || !service.username || !service.server_id) {
    console.log("Serviço incompleto para teste");
    return;
  }

  try {
    console.log(`Testando SSO para ${service.username} no servidor ${service.servers.hostname}`);
    const url = await getDASession(service.server_id, service.username);
    console.log("SSO gerado com sucesso:", url);
  } catch (err: any) {
    console.error("ERRO NO SSO:", err.message);
  }
}

testSSO();
