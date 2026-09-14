import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { 
  getApplicationsStore, 
  saveApplicationsStore, 
  getClusterServers, 
  getActiveClusterServer 
} from "../store.server";

export async function resetCloudApplication(appId: string, userId: string) {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) {
    throw new Error("Acesso negado");
  }

  console.log(`[resetCloudApplication] Iniciando reset completo do container ${appId} (${app.name})...`);

  // 1. Destruir permanentemente o container, serviços, volumes e arquivos no Swarm remoto
  try {
    const servers = await getClusterServers();
    const server = servers.find((s) => s.id === app.server_id) || (await getActiveClusterServer());
    const { removeSwarmServiceAndStack } = await import("@/lib/swarm-cluster.server");
    await removeSwarmServiceAndStack(app, server);
  } catch (swarmErr: any) {
    console.warn(`[resetCloudApplication Swarm Warning]:`, swarmErr?.message);
  }

  // 2. Limpar todos os arquivos físicos locais do container
  try {
    const { resolveClientRoot } = await import("@/lib/file-manager/security");
    const clientRoot = await resolveClientRoot(appId);
    if (fsSync.existsSync(clientRoot)) {
      const entries = await fs.readdir(clientRoot, { withFileTypes: true });
      for (const ent of entries) {
        await fs.rm(path.join(clientRoot, ent.name), { recursive: true, force: true });
      }
    }
  } catch (fsErr: any) {
    console.warn(`[resetCloudApplication Local FS Warning]:`, fsErr?.message);
  }

  // 3. Limpar arquivos e variáveis salvas no Supabase
  try {
    await supabaseAdmin.from("system_settings").delete().eq("key", `app_files_${appId}`);
    await supabaseAdmin.from("system_settings").delete().eq("key", `app_envs_${appId}`);
    await supabaseAdmin.from("system_settings").delete().eq("key", `swarm_envs_${appId}`);
  } catch (dbErr: any) {
    console.warn(`[resetCloudApplication DB Warning]:`, dbErr?.message);
  }

  // 4. Buscar o nome padrão do serviço contratado e limpar domínio em services
  let baseName = "Novo Container";
  try {
    const { data: svc } = await supabaseAdmin
      .from("services")
      .select("*, products(name)")
      .eq("id", app.service_id)
      .maybeSingle();
    if (svc?.products?.name) {
      baseName = svc.products.name;
    }
    await supabaseAdmin.from("services").update({ domain: "" }).eq("id", app.service_id);
  } catch {}

  // 5. Resetar totalmente o registro do container para o estado inicial zerado
  app.template_id = undefined;
  app.git_repository = undefined;
  app.git_branch = undefined;
  app.build_pack = "static";
  app.name = baseName;
  app.status = "provisioning"; // Retorna ao estado inicial zerado aguardando primeiro deploy
  app.fqdn = "";
  app.default_subdomain = "";
  app.custom_domain = undefined;
  app.stack_name = undefined;
  app.updated_at = new Date().toISOString();

  store[appId] = app;
  await saveApplicationsStore(store);

  console.log(`[resetCloudApplication] Container ${appId} resetado com sucesso para o estado inicial.`);
  return { success: true, message: "Container resetado e retornado ao estado inicial com sucesso." };
}
