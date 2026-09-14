import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateAppDefaultFqdn } from "@/lib/app-subdomain";
import { 
  getApplicationsStore, 
  saveApplicationsStore, 
  getActiveClusterServer,
} from "../store.server";
import type { ApplicationRecord } from "../types";

export async function provisionCloudApplication(serviceId: string, customConfig?: {
  name?: string;
  gitRepo?: string;
  gitBranch?: string;
  buildPack?: "nixpacks" | "dockerfile" | "dockercompose" | "static";
  cpuLimit?: number;
  memoryLimit?: number;
  diskLimitMb?: number;
  subdomain?: string;
  template_id?: string;
}) {
  const { data: service } = await supabaseAdmin
    .from("services")
    .select("*, products(name, product_type, disk_quota_mb)")
    .eq("id", serviceId)
    .single();

  if (!service) throw new Error("Serviço não encontrado");

  const server = await getActiveClusterServer();
  const store = await getApplicationsStore();

  const appName = customConfig?.name || service.domain || "Minha Aplicação";
  const wildcard = server.wildcardDomain || "dk1.eqsam.com";
  const defaultFqdn = generateAppDefaultFqdn({
    service_id: service.id,
    template_id: customConfig?.template_id,
    name: appName,
    build_pack: customConfig?.buildPack || "nixpacks",
  }, wildcard);

  const cleanSubdomain = customConfig?.subdomain 
    ? customConfig.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30)
    : defaultFqdn.replace(/^https?:\/\//i, "").split(".")[0];

  const fqdn = customConfig?.subdomain ? `http://${cleanSubdomain}.${wildcard}` : defaultFqdn;
  const memoryLimit = customConfig?.memoryLimit || 512;
  const cpuLimit = customConfig?.cpuLimit || 1.0;
  const diskLimitMb = customConfig?.diskLimitMb || (service as any)?.products?.disk_quota_mb || 2048;
  const buildPack = customConfig?.buildPack || "nixpacks";
  const gitRepo = customConfig?.gitRepo || "";
  const gitBranch = customConfig?.gitBranch || "main";
  const appUuid = `app_${crypto.randomUUID().slice(0, 12)}`;

  const appRecord: ApplicationRecord = {
    id: crypto.randomUUID(),
    service_id: service.id,
    user_id: service.user_id,
    server_id: server.id,
    project_uuid: "default",
    environment_name: "production",
    app_uuid: appUuid,
    name: appName,
    build_pack: buildPack,
    git_repository: gitRepo,
    git_branch: gitBranch,
    fqdn,
    default_subdomain: defaultFqdn,
    cpu_limit: cpuLimit,
    memory_limit: memoryLimit,
    disk_limit_mb: diskLimitMb,
    status: gitRepo ? "running" : "provisioning",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  store[appRecord.id] = appRecord;
  await saveApplicationsStore(store);

  await supabaseAdmin
    .from("services")
    .update({
      status: "active",
      domain: fqdn,
      notes: `Aplicação Cloud PaaS alocada no cluster DK1 (ID: ${appUuid})`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  return appRecord;
}
