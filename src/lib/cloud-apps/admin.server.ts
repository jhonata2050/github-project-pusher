import { supabaseAdmin } from "../../integrations/supabase/client.server";
import { 
  getApplicationsStore, 
  saveApplicationsStore,
  getActiveClusterServer,
} from "./store.server";
import { generateAppDefaultFqdn } from "../app-subdomain";
import type { ApplicationRecord } from "./types";

export async function getMyApplications(userId: string): Promise<ApplicationRecord[]> {
  const store = await getApplicationsStore();
  const { data: services } = await supabaseAdmin
    .from("services")
    .select("id, user_id, product_id, server_id, status, domain, billing_cycle, next_due_date, suspension_reason, created_at, updated_at, products(name, product_type, disk_quota_mb)")
    .eq("user_id", userId);

  const serviceMap = new Map((services || []).map((s: any) => [s.id, s]));
  const userApps = Object.values(store).filter((a) => a.user_id === userId);

  for (const s of (services || []) as any[]) {
    const isAppProduct = s.products?.product_type === "app" || s.products?.product_type === "bot";
    const existing = userApps.find((a) => a.service_id === s.id);
    if (isAppProduct && !existing) {
      const server = await getActiveClusterServer();
      const wildcard = server.wildcardDomain || "dk1.eqsam.com";
      const newAppId = crypto.randomUUID();
      const defaultFqdn = generateAppDefaultFqdn({
        id: newAppId,
        service_id: s.id,
        name: s.domain || s.products?.name,
        build_pack: "nixpacks",
      }, wildcard);

      const diskLimitMb = (s.products as any)?.disk_quota_mb || 1536;

      const newApp: ApplicationRecord = {
        id: newAppId,
        service_id: s.id,
        user_id: s.user_id,
        server_id: server.id,
        app_uuid: `app_${s.id.slice(0, 8)}`,
        name: s.domain || s.products?.name || "Minha Aplicação",
        build_pack: "nixpacks",
        fqdn: defaultFqdn,
        default_subdomain: defaultFqdn,
        cpu_limit: 1.0,
        memory_limit: 512,
        disk_limit_mb: diskLimitMb,
        status: s.status === "active" ? "running" : "stopped",
        created_at: s.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store[newApp.id] = newApp;
      userApps.push(newApp);
    }
  }

  const server = await getActiveClusterServer();
  const wildcard = server.wildcardDomain || "dk1.eqsam.com";
  let hasStoreUpdate = false;
  for (const a of userApps) {
    const svc: any = serviceMap.get(a.service_id);
    const diskFromProduct = (svc?.products as any)?.disk_quota_mb;
    if (diskFromProduct && a.disk_limit_mb !== diskFromProduct) {
      a.disk_limit_mb = diskFromProduct;
      hasStoreUpdate = true;
    }

    const canonicalDefault = generateAppDefaultFqdn(a, wildcard);
    if (a.default_subdomain !== canonicalDefault) {
      a.default_subdomain = canonicalDefault;
      hasStoreUpdate = true;
    }
    if (!a.custom_domain && (!a.fqdn || a.fqdn.includes("/app-") || a.fqdn.includes("http://app-") || a.fqdn.includes("https://app-"))) {
      a.fqdn = canonicalDefault;
      hasStoreUpdate = true;
    }
    if (hasStoreUpdate) {
      store[a.id] = a;
    }
  }

  if (hasStoreUpdate) {
    await saveApplicationsStore(store);
  }

  return userApps.map((a) => {
    const svc: any = serviceMap.get(a.service_id);
    const diskFromProduct = (svc?.products as any)?.disk_quota_mb;
    return {
      ...a,
      disk_limit_mb: diskFromProduct || a.disk_limit_mb || 1536,
      env_vars: undefined,
      service: svc || null,
    };
  });
}

export async function getAdminApplicationsList(): Promise<ApplicationRecord[]> {
  const store = await getApplicationsStore();
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, email");
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  return Object.values(store).map((a) => ({
    ...a,
    env_vars: undefined,
    user: profileMap.get(a.user_id) || null,
  }));
}

export async function updateCloudApplicationName(appId: string, newName: string, userId: string) {
  const cleanName = newName.trim();
  if (!cleanName) throw new Error("O nome da aplicação não pode ficar em branco.");

  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) throw new Error("Acesso negado");

  app.name = cleanName;
  app.updated_at = new Date().toISOString();
  store[appId] = app;
  await saveApplicationsStore(store);

  if (app.service_id) {
    try {
      await supabaseAdmin.from("services").update({
        notes: `Nome da Aplicação: ${cleanName}`,
        updated_at: new Date().toISOString(),
      }).eq("id", app.service_id);
    } catch (e) {}
  }

  return { success: true, name: cleanName, appId };
}

