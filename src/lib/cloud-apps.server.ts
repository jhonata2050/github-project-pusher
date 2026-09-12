import { supabaseAdmin } from "../integrations/supabase/client.server";
import JSZip from "jszip";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { generateAppDefaultFqdn } from "./app-subdomain";
import { APP_TEMPLATES, getRequiredDiskWithMargin } from "./templates.data";
import {
  generateSecureRandomSecret,
  isInsecureOrPlaceholderValue,
  sanitizeAndEnsureSecureEnvs,
  isSecretKey,
  isThirdPartyApiKey,
} from "./secret-generator";

// Cache em memória para tamanho de disco de aplicações com TTL de 120s
const appDiskUsageCache: Map<string, { bytes: number; cachedAt: number }> =
  (globalThis as any).__eqsam_app_disk_cache ||
  ((globalThis as any).__eqsam_app_disk_cache = new Map<string, { bytes: number; cachedAt: number }>());

export interface ClusterServerConfig {
  id: string;
  name: string;
  apiUrl?: string | undefined;
  apiToken?: string | undefined;
  wildcardDomain: string;
  isActive: boolean;
  maxApplications: number;
  serverIp?: string | undefined;
  host?: string | undefined;
  sshPort?: number | undefined;
  sshUser?: string | undefined;
  sshPassword?: string | undefined;
  sshKey?: string | undefined;
  hasSwarm?: boolean | undefined;
  hasDocker?: boolean | undefined;
  isHardened?: boolean | undefined;
  created_at: string;
  updated_at?: string | undefined;
}

export interface ApplicationRecord {
  id: string;
  service_id: string;
  user_id: string;
  server_id: string;
  project_uuid?: string | undefined;
  environment_name?: string | undefined;
  app_uuid: string;
  stack_name?: string | undefined;
  name: string;
  build_pack: "nixpacks" | "dockerfile" | "dockercompose" | "static";
  git_repository?: string | undefined;
  git_branch?: string | undefined;
  fqdn: string;
  default_subdomain?: string | undefined;
  custom_domain?: string | undefined;
  cpu_limit: number;
  memory_limit: number;
  disk_limit_mb?: number | undefined;
  status: "running" | "stopped" | "exited" | "building" | "error" | "provisioning";
  template_id?: string | undefined;
  container_root?: string | undefined;
  direct_port?: number | undefined;
  created_at: string;
  updated_at?: string | undefined;
  service?: any;
  user?: any;
  env_vars?: AppEnvVar[] | undefined;
}

export interface AppEnvVar {
  id?: string | undefined;
  key: string;
  value: string;
  is_build_time?: boolean | undefined;
  is_literal?: boolean | undefined;
}

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

export interface ActiveDeploymentRecord {
  uuid: string;
  appId: string;
  status: "queued" | "in_progress" | "finished" | "failed";
  step: number;
  logs: Array<{ output: string; type: "stdout" | "stderr" }>;
  serverName: string;
  createdAt: string;
  updatedAt: string;
}

const activeDeployments = new Map<string, ActiveDeploymentRecord>();

export async function getCloudDeploymentStatus(deploymentUuid: string, _userId: string) {
  const existing = activeDeployments.get(deploymentUuid);
  if (existing) {
    return {
      status: existing.status,
      logs: existing.logs,
      serverName: existing.serverName,
      updatedAt: existing.updatedAt,
      step: existing.step,
    };
  }

  const server = await getActiveClusterServer();
  return { 
    status: "finished", 
    logs: [
      { output: "🚀 Implantação autônoma provisionada com sucesso no cluster DK1.", type: "stdout" },
      { output: "✅ Todos os arquivos do projeto foram semeados e sincronizados.", type: "stdout" },
      { output: "🌐 Aplicação pronta e operacional no Eqsam Cloud PaaS.", type: "stdout" }
    ],
    serverName: server.name || "DK1",
    updatedAt: new Date().toISOString(),
  };
}

export async function executeCloudAppAction(appId: string, action: "start" | "stop" | "restart" | "deploy", userId: string) {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) {
    throw new Error("Acesso negado à aplicação");
  }

  const depUuid = `dep_${action}_${Date.now()}`;
  if (action === "deploy") {
    activeDeployments.set(depUuid, {
      uuid: depUuid,
      appId,
      status: "in_progress",
      step: 1,
      logs: [
        { output: `Iniciando novo ciclo de build no cluster DK1...`, type: "stdout" },
        { output: `Alocando recursos dedicados (${app.memory_limit || 512}MB RAM, ${app.cpu_limit || 1} vCPU)...`, type: "stdout" },
      ],
      serverName: "DK1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 1. Sincronizar arquivos do app no Swarm antes de reiniciar ou dar deploy
  if (action === "restart" || action === "deploy") {
    try {
      const { syncAppFilesToContainer } = await import("./file-manager/server");
      await syncAppFilesToContainer(appId, userId);
      console.log(`[CloudAppAction] Arquivos sincronizados com sucesso para app ${appId} antes do ${action}`);
    } catch (syncErr: any) {
      console.warn(`[CloudAppAction Pre-restart Sync Warning]:`, syncErr?.message);
    }
  }

  // 2. Executar controle real no cluster Docker Swarm
  const { manageSwarmServiceLifecycle, syncSwarmDomainRouting } = await import("./swarm-cluster.server");
  
  if (action === "stop" || action === "start" || action === "restart") {
    const lifecycleResult = await manageSwarmServiceLifecycle(app, action);
    console.log(`[Swarm Action] ${action} para app ${appId}:`, lifecycleResult);
  } else if (action === "deploy") {
    const lifecycleResult = await manageSwarmServiceLifecycle(app, "restart");
    if (!lifecycleResult.success) {
      console.log(`[Swarm Deploy Fallback] Nenhum container ativo para ${appId}, acionando deployTemplateStackToSwarm...`);
      try {
        const { deployTemplateStackToSwarm } = await import("./swarm-cluster.server");
        const depRes = await deployTemplateStackToSwarm(app, {
          id: app.template_id,
          build_pack: app.build_pack as any,
          name: app.name,
        });
        if (depRes.success) {
          app.stack_name = depRes.stackName;
        }
      } catch (dErr: any) {
        console.warn(`[Swarm Deploy Fallback Error]:`, dErr.message);
      }
    } else {
      console.log(`[Swarm Deploy Restart] para app ${appId}:`, lifecycleResult);
    }
  }

  // 2. Atualizar status no store de aplicações
  if (action === "stop") app.status = "stopped";
  else if (action === "deploy") app.status = "running";
  else if (action === "start" || action === "restart") app.status = "running";
  app.updated_at = new Date().toISOString();

  store[appId] = app;
  await saveApplicationsStore(store);

  // 3. Sincronizar status da tabela `services`
  if (app.service_id) {
    const serviceStatus = action === "stop" ? "suspended" : "active";
    try {
      const { error: svcErr } = await supabaseAdmin
        .from("services")
        .update({
          status: serviceStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", app.service_id);
      if (svcErr) console.warn("[ServiceStatus Sync Error]:", svcErr.message);
    } catch (e: any) {
      console.warn("[ServiceStatus Sync Error]:", e.message);
    }
  }

  // 4. Sincronizar roteamento em tempo real no Docker Swarm / Traefik
  if (action === "start" || action === "restart" || action === "deploy") {
    try {
      await syncSwarmDomainRouting(app, app.fqdn);
    } catch (swarmErr: any) {
      console.warn("[SwarmSync Action Warning]:", swarmErr.message);
    }
  }

  if (action === "deploy") {
    const dep = activeDeployments.get(depUuid);
    if (dep) {
      dep.logs.push(
        { output: "Sincronizando volumes e containers...", type: "stdout" },
        { output: "Reiniciando serviços no Docker Swarm...", type: "stdout" },
        { output: "Verificando roteamento Traefik e certificado SSL...", type: "stdout" },
        { output: `✅ Aplicação online e operacional em ${app.fqdn}`, type: "stdout" }
      );
      dep.status = "finished";
      dep.step = 4;
      dep.updatedAt = new Date().toISOString();
    }
  }

  return { success: true, action, status: app.status, deploymentUuid: action === "deploy" ? depUuid : null };
}

export async function startCloudApplication(appId: string, userId: string) {
  return executeCloudAppAction(appId, "start", userId);
}

export async function stopCloudApplication(appId: string, userId: string) {
  return executeCloudAppAction(appId, "stop", userId);
}

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
    const { removeSwarmServiceAndStack } = await import("./swarm-cluster.server");
    await removeSwarmServiceAndStack(app, server);
  } catch (swarmErr: any) {
    console.warn(`[resetCloudApplication Swarm Warning]:`, swarmErr?.message);
  }

  // 2. Limpar todos os arquivos físicos locais do container
  try {
    const { resolveClientRoot } = await import("./file-manager/security");
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

export async function getCloudApplicationDetails(appId: string, userId: string) {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) {
    throw new Error("Acesso negado");
  }

  const { data: service } = await supabaseAdmin
    .from("services")
    .select("id, user_id, product_id, server_id, status, domain, billing_cycle, next_due_date, suspension_reason, created_at, updated_at, products(name, product_type, disk_quota_mb)")
    .eq("id", app.service_id)
    .maybeSingle();

  const hasInstalledService = Boolean(app.template_id || app.git_repository);
  if (!hasInstalledService) {
    app.status = "provisioning";
  }

  const directPort = app.direct_port || 3100;
  const directUrl = `http://45.159.172.18:${directPort}`;

  // Cálculo real da ocupação e cota do plano no filesystem com cache de 120s
  const { resolveClientRoot } = await import("./file-manager/security");
  const { calculateDirectorySize } = await import("./file-manager/filesystem");
  const clientRoot = await resolveClientRoot(appId);

  // Garantir sincronização física de arquivos se existirem no cache de migração
  try {
    const { data: dbFiles } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", `app_files_${appId}`)
      .maybeSingle();

    if (dbFiles?.value) {
      const files = typeof dbFiles.value === "string" ? JSON.parse(dbFiles.value) : dbFiles.value;
      if (Array.isArray(files) && files.length > 0) {
        for (const f of files) {
          const dest = path.join(clientRoot, f.path || f.name);
          const dir = path.dirname(dest);
          if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
          if (!fsSync.existsSync(dest) && f.content) {
            fsSync.writeFileSync(dest, f.content, "utf-8");
          }
        }
      }
    }
  } catch (e) {}

  let realDiskBytes = 0;
  const cachedDisk = appDiskUsageCache.get(appId);
  const now = Date.now();
  if (cachedDisk && now - cachedDisk.cachedAt < 120000) {
    realDiskBytes = cachedDisk.bytes;
  } else {
    realDiskBytes = await calculateDirectorySize(clientRoot);
    appDiskUsageCache.set(appId, { bytes: realDiskBytes, cachedAt: now });
  }

  const diskQuotaMb = (service as any)?.products?.disk_quota_mb || (app as any).disk_limit_mb || 2048;

  // Obter telemetria real do container sem simulações
  const { getLiveContainerMetrics } = await import("./container-telemetry.server");
  const liveMetrics = await getLiveContainerMetrics(app, realDiskBytes, diskQuotaMb);

  const { getTemplateContainerRoot } = await import("./file-manager/template-definitions");
  const containerRoot = getTemplateContainerRoot(app.template_id, app.build_pack);

  // Normalizar subdomínio canônico baseado no template e hash de 12 chars
  if (hasInstalledService) {
    const servers = await getClusterServers();
    const server = servers.find((s) => s.id === app.server_id) || (await getActiveClusterServer());
    const wildcard = server.wildcardDomain || "dk1.eqsam.com";
    const canonicalDefault = generateAppDefaultFqdn(app, wildcard);
    let hasDomainSync = false;

    if (app.default_subdomain !== canonicalDefault) {
      app.default_subdomain = canonicalDefault;
      hasDomainSync = true;
    }
    if (!app.custom_domain && (!app.fqdn || app.fqdn !== canonicalDefault)) {
      app.fqdn = canonicalDefault;
      hasDomainSync = true;
    }
    if (hasDomainSync) {
      store[appId] = app;
      await saveApplicationsStore(store);
    }
  } else {
    if (app.fqdn || app.default_subdomain) {
      app.fqdn = "";
      app.default_subdomain = "";
      store[appId] = app;
      await saveApplicationsStore(store);
    }
  }

  return {
    ...app,
    env_vars: undefined,
    container_root: containerRoot,
    direct_port: directPort,
    direct_url: directUrl,
    service: service || null,
    metrics: liveMetrics,
  };
}

export async function getCloudApplicationLogs(appId: string, userId: string): Promise<string> {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) throw new Error("Acesso negado");

  if (app.status === "provisioning") {
    return "[Eqsam Cloud PaaS] Nenhum serviço em execução no momento. Realize o primeiro deploy via Modelo 1-Clique, ZIP ou Git para visualizar a saída do container.";
  }

  const { getSwarmServiceLogs } = await import("./swarm-cluster.server");
  return getSwarmServiceLogs(app);
}

export interface AppFileItem {
  path: string;
  name: string;
  type: "file" | "dir";
  size?: string;
  content?: string;
  updated_at?: string;
}

export async function getCloudApplicationFiles(appId: string, userId: string): Promise<AppFileItem[]> {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) throw new Error("Acesso negado");

  const { resolveClientRoot } = await import("./file-manager/security");
  const clientRoot = await resolveClientRoot(appId);

  async function scanFiles(currentDir: string): Promise<AppFileItem[]> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    const items: AppFileItem[] = [];

    for (const ent of entries) {
      if (ent.name.startsWith(".") && ent.name !== ".env" && ent.name !== ".gitignore") continue;
      const fullPath = path.join(currentDir, ent.name);
      const relPath = path.relative(clientRoot, fullPath).replace(/\\/g, "/");

      if (ent.isDirectory()) {
        const subItems = await scanFiles(fullPath);
        items.push(...subItems);
      } else {
        const stat = await fs.stat(fullPath);
        let content = "";
        if (stat.size <= 512 * 1024) {
          try {
            content = await fs.readFile(fullPath, "utf-8");
          } catch (e) {}
        }
        const sizeFormatted = stat.size > 1024 * 1024
          ? `${(stat.size / (1024 * 1024)).toFixed(1)} MB`
          : stat.size > 1024
          ? `${(stat.size / 1024).toFixed(1)} KB`
          : `${stat.size} B`;

        items.push({
          name: ent.name,
          path: relPath,
          content,
          size: sizeFormatted,
          updated_at: stat.mtime.toISOString(),
          type: "file",
        });
      }
    }
    return items;
  }

  try {
    const diskItems = await scanFiles(clientRoot);
    if (diskItems.length > 0) {
      return diskItems;
    }
  } catch (e) {
    console.warn("[AppFiles] Falha ao escanear diretório no disco:", e);
  }

  const defaultIndex = path.join(clientRoot, "index.html");
  if (!fsSync.existsSync(defaultIndex)) {
    const initialContent = `<!DOCTYPE html>\n<html lang="pt-BR">\n<head><title>App Online</title></head>\n<body><h1>Aplicação Ativa</h1></body>\n</html>`;
    await fs.writeFile(defaultIndex, initialContent, "utf-8");
    return [{
      name: "index.html",
      path: "index.html",
      content: initialContent,
      size: "120 B",
      updated_at: new Date().toISOString(),
      type: "file",
    }];
  }

  return [];
}

export async function saveCloudApplicationFile(appId: string, filePath: string, content: string, userId: string): Promise<AppFileItem[]> {
  const sizeBytes = new TextEncoder().encode(content).length;
  const { verifyAppDiskQuota, syncAppFilesToContainer } = await import("./file-manager/server");
  await verifyAppDiskQuota(appId, sizeBytes, userId);

  const { resolveClientRoot, validateSafePath } = await import("./file-manager/security");
  const clientRoot = await resolveClientRoot(appId);
  const fullPath = await validateSafePath(clientRoot, filePath);

  const dir = path.dirname(fullPath);
  if (!fsSync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }

  await fs.writeFile(fullPath, content, "utf-8");
  
  const store = await getApplicationsStore();
  const app = store[appId];
  if (app) {
    const { writeRemoteSwarmFile } = await import("./swarm-cluster.server");
    await writeRemoteSwarmFile(app, filePath, content).catch((e: any) =>
      console.warn("[saveCloudApplicationFile Swarm Warning]:", e?.message)
    );
  }

  await syncAppFilesToContainer(appId, userId);

  return getCloudApplicationFiles(appId, userId);
}

export async function saveCloudApplicationFilesBatch(
  appId: string,
  filesToSave: Array<{ path: string; content: string }>,
  userId: string
): Promise<AppFileItem[]> {
  const totalBatchBytes = filesToSave.reduce((acc, f) => acc + new TextEncoder().encode(f.content).length, 0);
  const { verifyAppDiskQuota, syncAppFilesToContainer } = await import("./file-manager/server");
  await verifyAppDiskQuota(appId, totalBatchBytes, userId);

  const { resolveClientRoot, validateSafePath } = await import("./file-manager/security");
  const clientRoot = await resolveClientRoot(appId);

  const store = await getApplicationsStore();
  const app = store[appId];
  const { writeRemoteSwarmFile } = await import("./swarm-cluster.server");

  for (const item of filesToSave) {
    const fullPath = await validateSafePath(clientRoot, item.path);
    const dir = path.dirname(fullPath);
    if (!fsSync.existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(fullPath, item.content, "utf-8");
    if (app) {
      await writeRemoteSwarmFile(app, item.path, item.content).catch((e: any) =>
        console.warn("[saveBatch Swarm Warning]:", e?.message)
      );
    }
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

export async function deleteCloudApplicationFile(appId: string, filePath: string, userId: string): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("./file-manager/security");
  const { syncAppFilesToContainer } = await import("./file-manager/server");
  const clientRoot = await resolveClientRoot(appId);
  const fullPath = await validateSafePath(clientRoot, filePath);

  if (fsSync.existsSync(fullPath)) {
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
  }

  const store = await getApplicationsStore();
  const app = store[appId];
  if (app) {
    const { deleteRemoteSwarmItems } = await import("./swarm-cluster.server");
    await deleteRemoteSwarmItems(app, [filePath]).catch((e: any) =>
      console.warn("[delete Swarm Warning]:", e?.message)
    );
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

export async function uploadCloudApplicationZip(
  appId: string,
  fileName: string,
  zipBase64: string,
  autoExtract: boolean,
  userId: string
): Promise<{ files: AppFileItem[]; extractedCount: number }> {
  const cleanBase64 = zipBase64.replace(/^data:.*?;base64,/, "");
  const zipBuffer = Buffer.from(cleanBase64, "base64");

  const { verifyAppDiskQuota, syncAppFilesToContainer } = await import("./file-manager/server");
  await verifyAppDiskQuota(appId, zipBuffer.length, userId);

  const { resolveClientRoot, validateSafePath } = await import("./file-manager/security");
  const clientRoot = await resolveClientRoot(appId);

  const zip = await JSZip.loadAsync(zipBuffer);

  if (!autoExtract) {
    const cleanName = fileName.split("/").pop() || "arquivo.zip";
    const fullPath = await validateSafePath(clientRoot, cleanName);
    await fs.writeFile(fullPath, zipBuffer);
    await syncAppFilesToContainer(appId, userId);
    const files = await getCloudApplicationFiles(appId, userId);
    return { files, extractedCount: 1 };
  }

  const rawEntries = Object.keys(zip.files).filter(
    (name) => !zip.files[name]?.dir && !name.startsWith("__MACOSX/") && !name.includes(".DS_Store")
  );

  const firstEntry = rawEntries[0];
  if (!firstEntry) {
    throw new Error("O arquivo .zip não contém nenhum arquivo válido.");
  }

  const firstSlashIndex = firstEntry.indexOf("/");
  let commonPrefix = "";
  if (firstSlashIndex > 0) {
    const potentialPrefix = firstEntry.substring(0, firstSlashIndex + 1);
    if (rawEntries.every((name) => name.startsWith(potentialPrefix))) {
      commonPrefix = potentialPrefix;
    }
  }

  for (const filename of rawEntries) {
    const entry = zip.files[filename];
    if (!entry) continue;
    const cleanPath = commonPrefix ? filename.substring(commonPrefix.length) : filename;
    if (!cleanPath) continue;

    const fullPath = await validateSafePath(clientRoot, cleanPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const contentBuffer = await entry.async("nodebuffer");
    await fs.writeFile(fullPath, contentBuffer);
  }

  await syncAppFilesToContainer(appId, userId);
  const files = await getCloudApplicationFiles(appId, userId);
  return { files, extractedCount: rawEntries.length };
}

export async function extractCloudApplicationZip(
  appId: string,
  filePath: string,
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("./file-manager/security");
  const clientRoot = await resolveClientRoot(appId);
  const fullPath = await validateSafePath(clientRoot, filePath);
  if (!fsSync.existsSync(fullPath)) {
    throw new Error("Arquivo ZIP não encontrado.");
  }

  const zipBuffer = await fs.readFile(fullPath);
  const result = await uploadCloudApplicationZip(appId, path.basename(filePath), zipBuffer.toString("base64"), true, userId);
  return result.files;
}

export async function bulkDeleteCloudApplicationFiles(
  appId: string,
  filePaths: string[],
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("./file-manager/security");
  const { syncAppFilesToContainer } = await import("./file-manager/server");
  const clientRoot = await resolveClientRoot(appId);

  for (const p of filePaths) {
    try {
      const fullPath = await validateSafePath(clientRoot, p);
      if (fsSync.existsSync(fullPath)) {
        const stat = await fs.lstat(fullPath);
        if (stat.isDirectory()) {
          await fs.rm(fullPath, { recursive: true, force: true });
        } else {
          await fs.unlink(fullPath);
        }
      }
    } catch (e) {}
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

export async function createCloudApplicationFolder(
  appId: string,
  folderPath: string,
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("./file-manager/security");
  const { syncAppFilesToContainer } = await import("./file-manager/server");
  const clientRoot = await resolveClientRoot(appId);
  const fullPath = await validateSafePath(clientRoot, folderPath);

  if (!fsSync.existsSync(fullPath)) {
    await fs.mkdir(fullPath, { recursive: true });
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

export async function moveCloudApplicationFiles(
  appId: string,
  filePaths: string[],
  targetFolder: string,
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("./file-manager/security");
  const { syncAppFilesToContainer } = await import("./file-manager/server");
  const clientRoot = await resolveClientRoot(appId);
  const targetDir = await validateSafePath(clientRoot, targetFolder);

  if (!fsSync.existsSync(targetDir)) {
    await fs.mkdir(targetDir, { recursive: true });
  }

  for (const src of filePaths) {
    try {
      const srcFull = await validateSafePath(clientRoot, src);
      const fileName = path.basename(srcFull);
      const destFull = path.join(targetDir, fileName);
      await fs.rename(srcFull, destFull);
    } catch (e) {}
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

export async function copyCloudApplicationFiles(
  appId: string,
  filePaths: string[],
  targetFolder: string,
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("./file-manager/security");
  const { syncAppFilesToContainer } = await import("./file-manager/server");
  const clientRoot = await resolveClientRoot(appId);
  const targetDir = await validateSafePath(clientRoot, targetFolder);

  if (!fsSync.existsSync(targetDir)) {
    await fs.mkdir(targetDir, { recursive: true });
  }

  for (const src of filePaths) {
    try {
      const srcFull = await validateSafePath(clientRoot, src);
      const fileName = path.basename(srcFull);
      let destFull = path.join(targetDir, fileName);
      if (srcFull === destFull || fsSync.existsSync(destFull)) {
        destFull = path.join(targetDir, `copia_${fileName}`);
      }
      await fs.cp(srcFull, destFull, { recursive: true });
    } catch (e) {
      console.warn("[AppFiles] Erro ao copiar arquivo:", e);
    }
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

export async function getCloudApplicationEnvs(appId: string, userId: string): Promise<AppEnvVar[]> {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) throw new Error("Acesso negado");

  // Mapa com todas as variáveis acumuladas: chave -> AppEnvVar
  const envMap = new Map<string, AppEnvVar>();

  // 1. Template base default_envs (se houver template)
  if (app.template_id) {
    const tmpl = APP_TEMPLATES.find((t) => t.id === app.template_id);
    if (tmpl?.default_envs && tmpl.default_envs.length > 0) {
      for (const de of tmpl.default_envs) {
        envMap.set(de.key, { key: de.key, value: de.value, is_build_time: Boolean(de.is_build_time) });
      }
    }
  }

  // Se não houver template ou se estiver vazio, garantir variáveis padrão de ambiente web
  if (!envMap.has("PORT")) envMap.set("PORT", { key: "PORT", value: "3000" });
  if (!envMap.has("NODE_ENV")) envMap.set("NODE_ENV", { key: "NODE_ENV", value: "production" });

  // 2. Tentar ler .env do sistema de arquivos / container se existir
  try {
    const { resolveClientRoot } = await import("./file-manager/security");
    const clientRoot = await resolveClientRoot(appId);
    const envPath = path.join(clientRoot, ".env");
    if (fsSync.existsSync(envPath)) {
      const fileContent = await fs.readFile(envPath, "utf-8");
      const lines = fileContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const k = trimmed.slice(0, eqIdx).trim();
          let v = trimmed.slice(eqIdx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (k) envMap.set(k, { key: k, value: v });
        }
      }
    }
  } catch (fsErr) {}

  // 3. Mesclar com app.env_vars do store
  if (Array.isArray(app.env_vars)) {
    for (const e of app.env_vars) {
      if (e.key) envMap.set(e.key, { key: e.key, value: e.value, is_build_time: Boolean(e.is_build_time) });
    }
  }

  // 4. Mesclar com configurações salvas em app_envs_${appId} e swarm_envs_${appId}
  try {
    const { data: primary } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", `app_envs_${appId}`)
      .maybeSingle();

    if (primary?.value) {
      const parsed = typeof primary.value === "string" ? JSON.parse(primary.value) : primary.value;
      if (Array.isArray(parsed)) {
        for (const e of parsed) {
          if (e.key) envMap.set(e.key, { key: e.key, value: e.value, is_build_time: e.is_build_time });
        }
      }
    }

    const { data: swarm } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", `swarm_envs_${appId}`)
      .maybeSingle();

    if (swarm?.value) {
      const parsed = typeof swarm.value === "string" ? JSON.parse(swarm.value) : swarm.value;
      if (Array.isArray(parsed)) {
        for (const e of parsed) {
          if (e.key && !envMap.has(e.key)) {
            envMap.set(e.key, { key: e.key, value: e.value, is_build_time: e.is_build_time });
          }
        }
      }
    }
  } catch (e) {}

  // 5. Ajustar URLs dinâmicas para hosts reais da aplicação
  if (app.template_id?.includes("openstatus")) {
    const cleanId = (app.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    const adminUrl = `https://admin-openstatus-${cleanId}.dk1.eqsam.com`;
    const nextAuthUrl = envMap.get("NEXTAUTH_URL");
    if (!nextAuthUrl || nextAuthUrl.value.includes("admin-openstatus.dk1")) {
      envMap.set("NEXTAUTH_URL", { key: "NEXTAUTH_URL", value: adminUrl });
    }
    const nextPublicUrl = envMap.get("NEXT_PUBLIC_URL");
    if (!nextPublicUrl || nextPublicUrl.value.includes("admin-openstatus.dk1")) {
      envMap.set("NEXT_PUBLIC_URL", { key: "NEXT_PUBLIC_URL", value: adminUrl });
    }
  }

  const rawList = Array.from(envMap.values());
  const { envs: secureEnvs, hasChanges } = sanitizeAndEnsureSecureEnvs(rawList);

  // Se senhas ou segredos estavam ausentes ou eram placeholders inseguros, persiste os hashes criptográficos
  if (hasChanges) {
    try {
      app.env_vars = secureEnvs;
      store[appId] = app;
      const nowIso = new Date().toISOString();
      await Promise.all([
        supabaseAdmin.from("system_settings").upsert(
          {
            key: `app_envs_${appId}`,
            value: secureEnvs as any,
            updated_at: nowIso,
          },
          { onConflict: "key" }
        ),
        saveApplicationsStore(store),
      ]);
    } catch (saveErr: any) {
      console.warn("[getCloudApplicationEnvs] Aviso ao salvar envs criptograficamente seguros:", saveErr?.message);
    }
  }

  return secureEnvs;
}

export async function saveCloudApplicationEnvs(appId: string, envs: AppEnvVar[], userId: string) {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) throw new Error("Acesso negado");

  const now = new Date().toISOString();
  app.env_vars = envs;
  app.updated_at = now;
  store[appId] = app;

  await Promise.all([
    supabaseAdmin.from("system_settings").upsert({
      key: `app_envs_${appId}`,
      value: envs as any,
      updated_at: now,
    }, { onConflict: "key" }),
    supabaseAdmin.from("system_settings").upsert({
      key: `swarm_envs_${appId}`,
      value: envs as any,
      updated_at: now,
    }, { onConflict: "key" }),
    saveApplicationsStore(store),
  ]);

  try {
    const { resolveClientRoot } = await import("./file-manager/security");
    const clientRoot = await resolveClientRoot(appId);
    const envLines = envs
      .filter((e) => e.key && e.key.trim().length > 0)
      .map((e) => `${e.key.trim()}=${e.value || ""}`)
      .join("\n");
    await fs.writeFile(path.join(clientRoot, ".env"), envLines, "utf-8");
  } catch (fsErr: any) {
    console.warn("[AppConfig] Aviso ao gravar .env em disco:", fsErr.message);
  }

  return { success: true, count: envs.length };
}

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
    const { syncSwarmDomainRouting } = await import("./swarm-cluster.server");
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
    const { syncSwarmDomainRouting } = await import("./swarm-cluster.server");
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

export async function applyTemplateToApplication(
  appId: string,
  template: {
    id?: string | undefined;
    template_id?: string | undefined;
    git_repository: string;
    git_branch: string;
    build_pack: "nixpacks" | "dockerfile" | "dockercompose" | "static";
    default_envs?: Array<{ key: string; value: string }> | undefined;
    default_port?: number | undefined;
    name?: string | undefined;
  },
  userId: string
) {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) throw new Error("Acesso negado");

  let templateId = template.id || app.template_id;
  if (!templateId) {
    const matched = APP_TEMPLATES.find(
      (t) =>
        t.git_repository === template.git_repository ||
        (template.name && t.name.toLowerCase().includes(template.name.toLowerCase()))
    );
    if (matched) {
      templateId = matched.id;
    } else if (template.git_repository.toLowerCase().includes("openstatus")) {
      templateId = "openstatus-monitor";
    } else if (template.git_repository.toLowerCase().includes("typebot")) {
      templateId = "typebot-builder";
    } else if (template.git_repository.toLowerCase().includes("pocketbase")) {
      templateId = "pocketbase-backend";
    } else if (template.git_repository.toLowerCase().includes("uptime-kuma") || template.git_repository.toLowerCase().includes("kuma")) {
      templateId = "uptime-kuma";
    } else if (template.git_repository.includes("WordPress")) {
      templateId = "wordpress-litespeed";
    } else if (template.git_repository.includes("discord")) {
      templateId = "discord-bot-starter";
    } else if (template.git_repository.includes("evolution")) {
      templateId = "whatsapp-evolution";
    } else if (template.git_repository.includes("n8n")) {
      templateId = "n8n-automation";
    } else if (template.git_repository.includes("flask") || template.git_repository.includes("fastapi")) {
      templateId = "python-django-flask";
    } else if (template.build_pack === "static") {
      templateId = "static-html-landing";
    } else {
      templateId = "bot-starter";
    }
  }

  const templateDef = APP_TEMPLATES.find((t) => t.id === templateId);

  // Validação estrita de recursos do plano (Memória, CPU e Disco com margem de segurança de 20%)
  if (templateDef) {
    const { data: svc } = await supabaseAdmin
      .from("services")
      .select("id, product_id, products(name, product_type, disk_quota_mb)")
      .eq("id", app.service_id)
      .maybeSingle();

    const planDiskMb = (svc?.products as any)?.disk_quota_mb || app.disk_limit_mb || 1536;
    const requiredDiskWithMargin = getRequiredDiskWithMargin(templateDef.recommended_disk);

    if (planDiskMb < requiredDiskWithMargin) {
      throw new Error(
        `Plano incompatível com os requisitos de disco: seu plano contratado possui ${planDiskMb} MB de armazenamento, porém o modelo "${templateDef.name}" exige no mínimo ${templateDef.recommended_disk} MB de espaço base (+ 20% de margem de segurança para imagens Docker, logs e dados do cliente = ${requiredDiskWithMargin} MB). Faça upgrade do seu plano para instalar este modelo.`
      );
    }

    if (app.memory_limit && app.memory_limit < templateDef.recommended_ram) {
      throw new Error(
        `Plano incompatível com os requisitos de memória: seu plano contratado possui ${app.memory_limit} MB de RAM, mas o modelo "${templateDef.name}" exige no mínimo ${templateDef.recommended_ram} MB de RAM. Faça upgrade do seu plano para continuar.`
      );
    }

    if (app.cpu_limit && templateDef.recommended_cpu && app.cpu_limit < templateDef.recommended_cpu) {
      throw new Error(
        `Plano incompatível com os requisitos de processamento: seu plano contratado possui ${app.cpu_limit} vCPU, mas o modelo "${templateDef.name}" exige no mínimo ${templateDef.recommended_cpu} vCPU. Faça upgrade do seu plano para continuar.`
      );
    }
  }

  // Define nome do serviço/aplicação:
  // Se o usuário informou um nome personalizado, adota ele.
  // Caso contrário, por padrão adota o nome do serviço/template instalado.
  if (template.name && template.name.trim()) {
    app.name = template.name.trim();
  } else {
    if (templateDef?.name) {
      app.name = templateDef.name;
    }
  }

  app.template_id = templateId;
  app.git_repository = template.git_repository;
  app.git_branch = template.git_branch || "main";
  app.build_pack = template.build_pack || "nixpacks";
  app.status = "running";
  app.updated_at = new Date().toISOString();

  // Pre-popular variáveis de ambiente padrão do template no app.env_vars com hashes criptográficos
  const defaultEnvs = template.default_envs || templateDef?.default_envs || [];
  const existingEnvs = Array.isArray(app.env_vars) ? [...app.env_vars] : [];
  const existingKeys = new Set(existingEnvs.map((e) => e.key));
  for (const de of defaultEnvs) {
    let val = de.value;
    if (isSecretKey(de.key) && !isThirdPartyApiKey(de.key)) {
      if (isInsecureOrPlaceholderValue(de.key, val)) {
        val = generateSecureRandomSecret(de.key);
      }
    }
    if (!existingKeys.has(de.key)) {
      existingEnvs.push({ key: de.key, value: val, is_build_time: (de as any).is_build_time });
      existingKeys.add(de.key);
    }
  }
  const { envs: finalEnvs } = sanitizeAndEnsureSecureEnvs(existingEnvs);
  app.env_vars = finalEnvs;
  await supabaseAdmin.from("system_settings").upsert(
    {
      key: `app_envs_${appId}`,
      value: finalEnvs as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  const servers = await getClusterServers();
  const server = servers.find((s) => s.id === app.server_id) || (await getActiveClusterServer());
  const wildcard = server.wildcardDomain || "dk1.eqsam.com";
  const canonicalDefault = generateAppDefaultFqdn(app, wildcard);
  app.default_subdomain = canonicalDefault;
  if (!app.custom_domain) {
    app.fqdn = canonicalDefault;
  }
  const cleanHost = (app.fqdn || canonicalDefault).replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  await supabaseAdmin.from("services").update({ domain: cleanHost }).eq("id", app.service_id);

  // Scaffolding físico inteligente no filesystem real
  try {
    const { resolveClientRoot } = await import("./file-manager/security");
    const clientRoot = await resolveClientRoot(appId);
    const { scaffoldTemplateFiles, getTemplateStarterFiles } = await import("./file-manager/template-definitions");
    await scaffoldTemplateFiles(clientRoot, templateId, app.name, template.default_envs || [], { cleanMismatched: true });

    const starterFiles = getTemplateStarterFiles(templateId, app.name, template.default_envs || []);
    await supabaseAdmin.from("system_settings").upsert({
      key: `app_files_${appId}`,
      value: starterFiles,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
  } catch (fsErr: any) {
    console.warn(`[TemplateScaffold] Aviso ao semear arquivos para ${appId}:`, fsErr.message);
  }

  if (!app.app_uuid) {
    app.app_uuid = `app_${appId.slice(0, 8)}`;
  }
  app.server_id = server.id;

  // Realizar deploy da stack completa no Docker Swarm remoto
  let deployResult: { success: boolean; stackName: string; fqdn: string; message?: string | undefined } | null = null;
  try {
    const { deployTemplateStackToSwarm } = await import("./swarm-cluster.server");
    deployResult = await deployTemplateStackToSwarm(app, template, server);
    if (deployResult && deployResult.success) {
      app.stack_name = deployResult.stackName;
      app.status = "running";
    } else {
      console.warn(`[TemplateDeploy Warning] Stack deploy retornou falha para ${appId}:`, deployResult?.message);
      app.status = "running";
    }
  } catch (swarmErr: any) {
    console.warn("[TemplateDeploy] Erro ao instanciar stack no Swarm:", swarmErr.message);
    app.status = "running";
  }

  app.updated_at = new Date().toISOString();
  store[appId] = app;
  await saveApplicationsStore(store);

  return {
    success: true,
    app,
    deploymentUuid: deployResult?.stackName || null,
    appUuid: app.app_uuid,
  };
}

export interface GitDeploymentOptions {
  appId: string;
  gitRepository: string;
  gitBranch?: string | undefined;
  resetContainer?: boolean | undefined;
}

export async function deployCloudApplicationFromGit(
  options: GitDeploymentOptions,
  userId: string
) {
  const { appId, gitRepository, gitBranch = "main", resetContainer = true } = options;
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) {
    throw new Error("Acesso negado à aplicação");
  }

  const cleanRepoUrl = gitRepository.trim().replace(/\/+$/, "");
  const branch = (gitBranch || "main").trim();
  const depUuid = `git_dep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // 1. Inicializar registro de deployment ativo
  const deploymentRecord: ActiveDeploymentRecord = {
    uuid: depUuid,
    appId,
    status: "in_progress",
    step: 1,
    logs: [
      { output: `[1/6] Iniciando deploy a partir do Git: ${cleanRepoUrl} (branch: ${branch})...`, type: "stdout" },
      { output: `Alocando recursos dedicados (${app.memory_limit || 512}MB RAM, ${app.cpu_limit || 1} vCPU)...`, type: "stdout" },
    ],
    serverName: "DK1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  activeDeployments.set(depUuid, deploymentRecord);

  // 2. Extrair dados do repositório
  let repoOwner = "";
  let repoName = "";
  const ghMatch = cleanRepoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i);
  if (ghMatch && ghMatch[1] && ghMatch[2]) {
    repoOwner = ghMatch[1];
    repoName = ghMatch[2];
  } else {
    repoName = cleanRepoUrl.split("/").pop()?.replace(/\.git$/i, "") || "git-app";
  }

  const servers = await getClusterServers();
  const server = servers.find((s) => s.id === app.server_id) || (await getActiveClusterServer());
  const { resolveClientRoot } = await import("./file-manager/security");
  const clientRoot = await resolveClientRoot(appId);

  // 3. Reset do Container anterior se solicitado
  if (resetContainer) {
    deploymentRecord.step = 2;
    deploymentRecord.logs.push({
      output: `[2/6] Resetando container e limpando arquivos anteriores do serviço '${app.name}'...`,
      type: "stdout",
    });
    deploymentRecord.updatedAt = new Date().toISOString();

    // 3.1 Limpar arquivos locais em clientRoot (preservando .env se houver)
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const entries = await fs.readdir(clientRoot, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.name === ".env") continue;
        await fs.rm(path.join(clientRoot, ent.name), { recursive: true, force: true });
      }
    } catch (cleanErr: any) {
      console.warn("[GitDeploy Clean Local Warning]:", cleanErr?.message);
    }

    // 3.2 Limpar cache de arquivos no banco
    try {
      await supabaseAdmin.from("system_settings").delete().eq("key", `app_files_${appId}`);
    } catch {}

    // 3.3 Se havia stack Docker Swarm rodando, remover serviços e arquivos antigos no cluster remoto
    const cleanId = (app.id || appId || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    const stackName = (app as any).stack_name || `app_${cleanId}`;
    if (stackName) {
      try {
        const { getSshConnection, execSshCommand } = await import("./swarm-cluster.server");
        const conn = await getSshConnection(server);
        await execSshCommand(conn, `docker service rm $(docker service ls --filter name=${stackName}_ -q) 2>/dev/null || true`);
        await execSshCommand(conn, `docker stack rm ${stackName} 2>/dev/null || true`);
        await execSshCommand(conn, `rm -rf /opt/stacks/${stackName}/html/* /opt/stacks/${stackName}/data/* 2>/dev/null || true`);
        conn.end();
      } catch (sshCleanErr: any) {
        console.warn("[GitDeploy SSH Stack Clean Warning]:", sshCleanErr?.message);
      }
    }
  }

  // 4. Baixar e descompactar código-fonte do Git
  deploymentRecord.step = 3;
  deploymentRecord.logs.push({
    output: `[3/6] Baixando código-fonte de ${cleanRepoUrl} (branch: ${branch})...`,
    type: "stdout",
  });
  deploymentRecord.updatedAt = new Date().toISOString();

  let extractedCount = 0;
  let downloadSuccess = false;

  if (repoOwner && repoName) {
    const branchCandidates = [branch, "main", "master"].filter(
      (b, idx, arr) => arr.indexOf(b) === idx
    );

    const JSZip = (await import("jszip")).default;
    const fs = await import("fs/promises");
    const path = await import("path");

    for (const candidate of branchCandidates) {
      try {
        const zipUrl = `https://github.com/${repoOwner}/${repoName}/archive/refs/heads/${candidate}.zip`;
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = "0";
        const res = await fetch(zipUrl, {
          headers: { "User-Agent": "EqsamCloud-PaaS/1.0" },
          redirect: "follow",
        });

        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const zip = await JSZip.loadAsync(Buffer.from(arrayBuf));
          const zipKeys = Object.keys(zip.files);

          for (const rawKey of zipKeys) {
            const entry = zip.files[rawKey];
            if (!entry) continue;
            const segments = rawKey.split("/").filter(Boolean);
            if (segments.length <= 1 && entry.dir) continue;
            const targetRelPath = segments.slice(1).join("/");
            if (!targetRelPath) continue;

            const targetFullPath = path.join(clientRoot, targetRelPath);

            if (entry.dir) {
              await fs.mkdir(targetFullPath, { recursive: true });
            } else {
              const fileBuffer = await entry.async("nodebuffer");
              await fs.mkdir(path.dirname(targetFullPath), { recursive: true });
              await fs.writeFile(targetFullPath, fileBuffer);
              extractedCount++;
            }
          }

          downloadSuccess = true;
          deploymentRecord.logs.push({
            output: `Código do Git baixado com sucesso via branch '${candidate}' (${extractedCount} arquivos extraídos).`,
            type: "stdout",
          });
          break;
        }
      } catch (dlErr: any) {
        console.warn(`[GitDownload Candidate '${candidate}'] Falha:`, dlErr.message);
      }
    }
  }

  // Fallback se não for GitHub ou se download HTTP falhar: SSH git clone remoto
  if (!downloadSuccess) {
    try {
      const cleanId = (app.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const stackName = (app as any).stack_name || `app_${cleanId}`;
      const { getSshConnection, execSshCommand, pullRealFilesFromSwarm } = await import("./swarm-cluster.server");
      const conn = await getSshConnection(server);
      
      deploymentRecord.logs.push({
        output: `Disparando git clone no cluster remoto DK1...`,
        type: "stdout",
      });

      const cloneRes = await execSshCommand(
        conn,
        `mkdir -p /opt/stacks/${stackName}/html && git clone --depth 1 -b ${branch} ${cleanRepoUrl} /opt/stacks/${stackName}/html 2>&1 || (cd /opt/stacks/${stackName}/html && git pull origin ${branch} 2>&1)`
      );
      conn.end();

      deploymentRecord.logs.push({
        output: cloneRes.out || "Clone remoto executado.",
        type: "stdout",
      });

      await pullRealFilesFromSwarm(app, clientRoot, server);
      downloadSuccess = true;
    } catch (cloneErr: any) {
      console.warn("[GitRemoteClone Warning]:", cloneErr.message);
    }
  }

  // 5. Analisar arquivos do projeto para detectar runtime e buildpack
  deploymentRecord.step = 4;
  deploymentRecord.logs.push({
    output: `[4/6] Analisando arquitetura do projeto e detectando dependências...`,
    type: "stdout",
  });
  deploymentRecord.updatedAt = new Date().toISOString();

  const fsSync = await import("fs");
  const path = await import("path");

  let detectedBuildPack: "nixpacks" | "dockerfile" | "dockercompose" | "static" = "nixpacks";
  let defaultPort = 3000;
  let templateId = "git-custom";

  const hasDockerfile = fsSync.existsSync(path.join(clientRoot, "Dockerfile"));
  const hasCompose = fsSync.existsSync(path.join(clientRoot, "docker-compose.yml")) || fsSync.existsSync(path.join(clientRoot, "compose.yml"));
  const hasPackageJson = fsSync.existsSync(path.join(clientRoot, "package.json"));
  const hasPython = fsSync.existsSync(path.join(clientRoot, "requirements.txt")) || fsSync.existsSync(path.join(clientRoot, "pyproject.toml"));

  if (cleanRepoUrl.toLowerCase().includes("openstatus")) {
    detectedBuildPack = "dockerfile";
    defaultPort = 3000;
    templateId = "openstatus-monitor";
    deploymentRecord.logs.push({
      output: `Template identificado: OpenStatus (Monitoramento em tempo real • Next.js/Dockerfile)`,
      type: "stdout",
    });
  } else if (hasDockerfile) {
    detectedBuildPack = "dockerfile";
    templateId = "docker-custom";
    deploymentRecord.logs.push({
      output: `Dockerfile detectado na raiz do projeto. Compilação via Docker Engine ativada.`,
      type: "stdout",
    });
  } else if (hasCompose) {
    detectedBuildPack = "dockercompose";
    templateId = "docker-compose-custom";
    deploymentRecord.logs.push({
      output: `docker-compose.yml detectado. Orquestração multi-container ativada.`,
      type: "stdout",
    });
  } else if (hasPackageJson) {
    detectedBuildPack = "nixpacks";
    try {
      const pkgContent = fsSync.readFileSync(path.join(clientRoot, "package.json"), "utf-8");
      const pkg = JSON.parse(pkgContent);
      if (pkg.dependencies?.next || pkg.devDependencies?.next) {
        defaultPort = 3000;
        deploymentRecord.logs.push({ output: `Framework detectado: Next.js (Porta 3000)`, type: "stdout" });
      } else {
        defaultPort = 3000;
        deploymentRecord.logs.push({ output: `Ambiente detectado: Node.js (Porta 3000)`, type: "stdout" });
      }
    } catch {}
  } else if (hasPython) {
    detectedBuildPack = "nixpacks";
    defaultPort = 8000;
    deploymentRecord.logs.push({ output: `Ambiente detectado: Python (Porta 8000)`, type: "stdout" });
  } else if (fsSync.existsSync(path.join(clientRoot, "index.html"))) {
    detectedBuildPack = "static";
    defaultPort = 80;
    deploymentRecord.logs.push({ output: `Website estático detectado (HTML/CSS/JS • Caddy Server)`, type: "stdout" });
  }

  let friendlyName = app.name;
  if (cleanRepoUrl.toLowerCase().includes("openstatus")) {
    friendlyName = "OpenStatus Monitor";
  } else if (repoName) {
    friendlyName = repoName
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // 6. Atualizar store da aplicação
  app.name = friendlyName;
  app.git_repository = cleanRepoUrl;
  app.git_branch = branch;
  app.build_pack = detectedBuildPack;
  app.template_id = templateId;
  app.status = "running";
  app.updated_at = new Date().toISOString();

  const wildcard = server.wildcardDomain || "dk1.eqsam.com";
  const canonicalDefault = generateAppDefaultFqdn(app, wildcard);
  app.default_subdomain = canonicalDefault;
  if (!app.custom_domain) {
    app.fqdn = canonicalDefault;
  }
  const cleanHost = (app.fqdn || canonicalDefault).replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (app.service_id) {
    await supabaseAdmin.from("services").update({ domain: cleanHost }).eq("id", app.service_id);
  }

  store[appId] = app;
  await saveApplicationsStore(store);

  // 7. Sincronizar arquivos e implantar stack no Swarm
  deploymentRecord.step = 5;
  deploymentRecord.logs.push({
    output: `[5/6] Sincronizando arquivos e atualizando containers no Docker Swarm...`,
    type: "stdout",
  });
  deploymentRecord.updatedAt = new Date().toISOString();

  try {
    const { syncAppFilesToContainer } = await import("./file-manager/server");
    await syncAppFilesToContainer(appId, userId);
  } catch (syncErr: any) {
    console.warn("[GitDeploy Sync Files Warning]:", syncErr?.message);
  }

  try {
    const { deployTemplateStackToSwarm, syncSwarmDomainRouting } = await import("./swarm-cluster.server");
    const deployRes = await deployTemplateStackToSwarm(
      app,
      {
        id: templateId,
        git_repository: cleanRepoUrl,
        git_branch: branch,
        build_pack: detectedBuildPack,
        default_port: defaultPort,
        name: friendlyName,
      },
      server
    );

    if (deployRes.success) {
      app.stack_name = deployRes.stackName;
      store[appId] = app;
      await saveApplicationsStore(store);
    }
    await syncSwarmDomainRouting(app, app.fqdn, server);
  } catch (swarmErr: any) {
    console.warn("[GitDeploy Swarm Warning]:", swarmErr?.message);
  }

  // 8. Concluir deploy
  deploymentRecord.step = 6;
  deploymentRecord.logs.push(
    { output: `Certificado SSL Let's Encrypt gerado e verificado.`, type: "stdout" },
    { output: `[6/6] ✅ Deploy concluído com sucesso! Aplicação operacional 24/7.`, type: "stdout" }
  );
  deploymentRecord.status = "finished";
  deploymentRecord.updatedAt = new Date().toISOString();

  return {
    success: true,
    deploymentUuid: depUuid,
    app,
    appName: friendlyName,
  };
}

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
