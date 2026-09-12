import { supabaseAdmin } from "../../integrations/supabase/client.server";
import { 
  getApplicationsStore, 
  saveApplicationsStore, 
  getActiveClusterServer,
  getClusterServers,
} from "./store.server";
import { generateAppDefaultFqdn } from "../app-subdomain";
import type { ClusterServerConfig } from "./types";

export async function updateCloudApplicationDomain(appId: string, newDomain: string, userId: string) {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) throw new Error("Acesso negado");

  let cleanFqdn = newDomain.trim().toLowerCase();
  if (!cleanFqdn.startsWith("http://") && !cleanFqdn.startsWith("https://")) {
    cleanFqdn = `https://${cleanFqdn}`;
  }

  if (!app.default_subdomain && app.fqdn && (app.fqdn.includes(".dk1.eqsam.com") || app.fqdn.includes(".eqsam.cloud"))) {
    app.default_subdomain = app.fqdn;
  }

  const rawHost = cleanFqdn.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const isDefaultSubdomain = Boolean(app.default_subdomain && cleanFqdn === app.default_subdomain);

  app.fqdn = cleanFqdn;
  app.custom_domain = isDefaultSubdomain ? undefined : rawHost;
  app.updated_at = new Date().toISOString();
  store[appId] = app;
  await saveApplicationsStore(store);

  const servers = await getClusterServers();
  const server = servers.find((s) => s.id === app.server_id) || (await getActiveClusterServer());

  // Sincronizar roteamento em tempo real no Docker Swarm / Traefik
  try {
    const { syncSwarmDomainRouting } = await import("../swarm-cluster.server");
    await syncSwarmDomainRouting(app, cleanFqdn, server);
  } catch (swarmErr: any) {
    console.warn("[SwarmDomainSync] Aviso ao sincronizar Swarm:", swarmErr.message);
  }

  await supabaseAdmin
    .from("services")
    .update({ domain: rawHost })
    .eq("id", app.service_id);

  return { 
    success: true, 
    fqdn: cleanFqdn, 
    custom_domain: app.custom_domain,
    default_subdomain: app.default_subdomain 
  };
}

export async function resetCloudApplicationDomain(appId: string, userId: string) {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) throw new Error("Acesso negado");

  const servers = await getClusterServers();
  const server = servers.find((s) => s.id === app.server_id) || (await getActiveClusterServer());
  const wildcard = server.wildcardDomain || "dk1.eqsam.com";
  const defaultFqdn = generateAppDefaultFqdn(app, wildcard);

  app.fqdn = defaultFqdn;
  app.default_subdomain = defaultFqdn;
  app.custom_domain = undefined;
  app.updated_at = new Date().toISOString();
  store[appId] = app;
  await saveApplicationsStore(store);

  const rawHost = defaultFqdn.replace(/^https?:\/\//i, "").replace(/\/+$/, "");

  // Sincronizar roteamento em tempo real no Docker Swarm / Traefik
  try {
    const { syncSwarmDomainRouting } = await import("../swarm-cluster.server");
    await syncSwarmDomainRouting(app, defaultFqdn, server);
  } catch (swarmErr: any) {
    console.warn("[SwarmDomainSync] Aviso ao sincronizar Swarm:", swarmErr.message);
  }

  await supabaseAdmin
    .from("services")
    .update({ domain: rawHost })
    .eq("id", app.service_id);

  return { success: true, fqdn: defaultFqdn };
}

export async function verifyApplicationDomainDns(domain: string, targetClusterIp = "45.159.172.137") {
  const cleanDomain = domain
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim()
    .toLowerCase();

  if (!cleanDomain || cleanDomain.length < 3) {
    return {
      success: false,
      isConfigured: false,
      status: "invalid",
      message: "Por favor informe um domínio válido.",
    };
  }

  try {
    const dns = await import("node:dns/promises");
    
    let aRecords: string[] = [];
    try {
      aRecords = await dns.resolve4(cleanDomain);
    } catch {}

    let cnameRecords: string[] = [];
    try {
      cnameRecords = await dns.resolveCname(cleanDomain);
    } catch {}

    const matchesIp = aRecords.includes(targetClusterIp) || 
                      aRecords.includes("45.159.172.18") || 
                      aRecords.includes("45.159.172.36");
    const matchesCname = cnameRecords.some((c) => c.includes("eqsam.com") || c.includes("eqsam.cloud"));

    if (matchesIp || matchesCname) {
      return {
        success: true,
        isConfigured: true,
        cleanDomain,
        aRecords,
        cnameRecords,
        targetClusterIp,
        status: "propagated",
        message: "Apontamento DNS verificado com sucesso! Seu tráfego está direcionado para o cluster.",
      };
    }

    if (aRecords.length > 0) {
      return {
        success: true,
        isConfigured: false,
        cleanDomain,
        aRecords,
        cnameRecords,
        targetClusterIp,
        status: "wrong_ip",
        message: `O domínio está respondendo no IP [${aRecords.join(", ")}]. Altere para o IP do cluster: ${targetClusterIp}.`,
      };
    }

    return {
      success: true,
      isConfigured: false,
      cleanDomain,
      aRecords: [],
      cnameRecords: [],
      targetClusterIp,
      status: "pending",
      message: "Nenhum apontamento DNS detectado ainda. Se você acabou de criar o registro, aguarde a propagação (5 a 30 min).",
    };
  } catch (err: any) {
    return {
      success: false,
      isConfigured: false,
      cleanDomain,
      targetClusterIp,
      status: "error",
      message: `Erro na consulta DNS: ${err.message}`,
    };
  }
}

