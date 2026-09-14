import { supabaseAdmin } from "../../../../integrations/supabase/client.server";
import { 
  getApplicationsStore, 
  saveApplicationsStore, 
  getActiveClusterServer,
  getClusterServers,
} from "../../store.server";
import { generateAppDefaultFqdn } from "../../../app-subdomain";
import { activeDeployments } from "../../types";
import type { GitDeploymentOptions, ActiveDeploymentRecord } from "../../types";
import { detectProjectBuildpack } from "../buildpack-detector";
import { resetPreviousGitDeploy } from "./git-container-reset.server";
import { fetchGitSourceCode } from "./git-source-fetcher.server";
import { deployGitSwarmStack } from "./git-stack-provision.server";

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
  const { resolveClientRoot } = await import("../../../file-manager/security");
  const clientRoot = await resolveClientRoot(appId);

  // 3. Reset do Container anterior se solicitado
  if (resetContainer) {
    await resetPreviousGitDeploy(app, appId, clientRoot, server, deploymentRecord);
  }

  // 4. Baixar e descompactar código-fonte do Git
  await fetchGitSourceCode(
    cleanRepoUrl,
    branch,
    repoOwner,
    repoName,
    clientRoot,
    app,
    server,
    deploymentRecord
  );

  // 5. Analisar arquivos do projeto para detectar runtime e buildpack
  deploymentRecord.step = 4;
  deploymentRecord.logs.push({
    output: `[4/6] Analisando arquitetura do projeto e detectando dependências...`,
    type: "stdout",
  });
  deploymentRecord.updatedAt = new Date().toISOString();

  const { detectedBuildPack, defaultPort, templateId } = detectProjectBuildpack(
    clientRoot,
    cleanRepoUrl,
    deploymentRecord
  );

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
  await deployGitSwarmStack(
    app,
    appId,
    userId,
    templateId,
    cleanRepoUrl,
    branch,
    detectedBuildPack,
    defaultPort,
    friendlyName,
    server,
    store,
    deploymentRecord
  );

  return {
    success: true,
    deploymentUuid: depUuid,
    app,
    appName: friendlyName,
  };
}

export * from "./git-container-reset.server";
export * from "./git-source-fetcher.server";
export * from "./git-stack-provision.server";
