import { supabaseAdmin } from "../../integrations/supabase/client.server";
import { generateAppDefaultFqdn } from "../app-subdomain";
import type { ClusterServerConfig, ApplicationRecord } from "./types";

// Cache em memória para tamanho de disco de aplicações com TTL de 120s
export const appDiskUsageCache: Map<string, { bytes: number; cachedAt: number }> =
  (globalThis as any).__eqsam_app_disk_cache ||
  ((globalThis as any).__eqsam_app_disk_cache = new Map<string, { bytes: number; cachedAt: number }>());

export async function getClusterServers(): Promise<ClusterServerConfig[]> {
  try {
    const { data: primary } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "cluster_servers_registry")
      .maybeSingle();

    if (primary?.value) {
      return typeof primary.value === "string" ? JSON.parse(primary.value) : primary.value;
    }

    // Fallback de compatibilidade transparente
    const { data: swarm } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "swarm_servers_registry")
      .maybeSingle();

    if (swarm?.value) {
      const servers = typeof swarm.value === "string" ? JSON.parse(swarm.value) : swarm.value;
      await saveClusterServers(servers);
      return servers;
    }
  } catch (e) {
    console.warn("[ServerRegistry] Erro ao ler servidores do cluster:", e);
  }
  return [];
}

export async function saveClusterServers(servers: ClusterServerConfig[]): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all([
    supabaseAdmin.from("system_settings").upsert({
      key: "cluster_servers_registry",
      value: servers as any,
      updated_at: now,
    }, { onConflict: "key" }),
    supabaseAdmin.from("system_settings").upsert({
      key: "swarm_servers_registry",
      value: servers as any,
      updated_at: now,
    }, { onConflict: "key" }),
  ]);
}

export async function getApplicationsStore(): Promise<Record<string, ApplicationRecord>> {
  try {
    const { data: primary } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "cloud_applications_store")
      .maybeSingle();

    if (primary?.value) {
      const parsed = typeof primary.value === "string" ? JSON.parse(primary.value) : primary.value;
      return normalizeStoreRecords(parsed);
    }

    // Fallback de compatibilidade
    const { data: swarm } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "swarm_applications_store")
      .maybeSingle();

    if (swarm?.value) {
      const parsed = typeof swarm.value === "string" ? JSON.parse(swarm.value) : swarm.value;
      const normalized = normalizeStoreRecords(parsed);
      await saveApplicationsStore(normalized);
      return normalized;
    }
  } catch (e) {
    console.warn("[AppStore] Erro ao ler aplicações:", e);
  }
  return {};
}

function normalizeStoreRecords(store: Record<string, any>): Record<string, ApplicationRecord> {
  const result: Record<string, ApplicationRecord> = {};
  for (const [id, raw] of Object.entries(store || {})) {
    const serverId = raw.server_id || "default-cluster-1";
    const appUuid = raw.app_uuid || `app_${id.slice(0, 8)}`;
    const clean = { ...raw };
    for (const k of Object.keys(clean)) {
      if (k.startsWith("legacy_") || k.startsWith("old_")) delete clean[k];
    }
    const canonicalDefault = generateAppDefaultFqdn({ ...clean, id });
    if (!clean.default_subdomain || clean.default_subdomain.includes("/app-") || clean.default_subdomain.includes("developerpro15gb")) {
      clean.default_subdomain = canonicalDefault;
    }
    if (!clean.custom_domain && (!clean.fqdn || clean.fqdn.includes("/app-") || clean.fqdn.includes("developerpro15gb") || clean.fqdn.includes("http://app-") || clean.fqdn.includes("https://app-"))) {
      clean.fqdn = canonicalDefault;
    }
    result[id] = {
      ...clean,
      server_id: serverId,
      app_uuid: appUuid,
      project_uuid: raw.project_uuid || "default",
      environment_name: raw.environment_name || "production",
    };
  }
  return result;
}

export async function saveApplicationsStore(store: Record<string, ApplicationRecord>): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all([
    supabaseAdmin.from("system_settings").upsert({
      key: "cloud_applications_store",
      value: store as any,
      updated_at: now,
    }, { onConflict: "key" }),
    supabaseAdmin.from("system_settings").upsert({
      key: "swarm_applications_store",
      value: store as any,
      updated_at: now,
    }, { onConflict: "key" }),
  ]);
}

export async function getActiveClusterServer(): Promise<ClusterServerConfig> {
  const servers = await getClusterServers();
  const active = servers.find((s) => s.isActive);
  if (!active) {
    return {
      id: "default-cluster-1",
      name: "Servidor Principal Cloud PaaS",
      wildcardDomain: "dk1.eqsam.com",
      serverIp: "45.159.172.137",
      host: "45.159.172.137",
      sshPort: 30795,
      sshUser: "root",
      hasSwarm: true,
      hasDocker: true,
      isActive: true,
      maxApplications: 200,
      created_at: new Date().toISOString(),
    };
  }
  return active;
}

