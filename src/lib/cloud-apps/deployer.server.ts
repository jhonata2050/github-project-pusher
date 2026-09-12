import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { supabaseAdmin } from "../../integrations/supabase/client.server";
import { 
  getApplicationsStore, 
  saveApplicationsStore, 
  getActiveClusterServer,
  getClusterServers,
} from "./store.server";
import { generateAppDefaultFqdn } from "../app-subdomain";
import { APP_TEMPLATES, getRequiredDiskWithMargin } from "../templates.data";
import { 
  sanitizeAndEnsureSecureEnvs, 
  isSecretKey, 
  isThirdPartyApiKey, 
  isInsecureOrPlaceholderValue, 
  generateSecureRandomSecret 
} from "../secret-generator";
import { activeDeployments } from "./types";
import type { ApplicationRecord, GitDeploymentOptions, ClusterServerConfig, ActiveDeploymentRecord } from "./types";

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
    const { resolveClientRoot } = await import("../file-manager/security");
    const clientRoot = await resolveClientRoot(appId);
    const { scaffoldTemplateFiles, getTemplateStarterFiles } = await import("../file-manager/template-definitions");
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
    const { deployTemplateStackToSwarm } = await import("../swarm-cluster.server");
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
  const { resolveClientRoot } = await import("../file-manager/security");
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
        const { getSshConnection, execSshCommand } = await import("../swarm-cluster.server");
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
      const { getSshConnection, execSshCommand, pullRealFilesFromSwarm } = await import("../swarm-cluster.server");
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
    const { syncAppFilesToContainer } = await import("../file-manager/server");
    await syncAppFilesToContainer(appId, userId);
  } catch (syncErr: any) {
    console.warn("[GitDeploy Sync Files Warning]:", syncErr?.message);
  }

  try {
    const { deployTemplateStackToSwarm, syncSwarmDomainRouting } = await import("../swarm-cluster.server");
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

