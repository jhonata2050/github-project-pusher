import { supabaseAdmin } from "../../../integrations/supabase/client.server";
import { 
  getApplicationsStore, 
  saveApplicationsStore, 
  getActiveClusterServer,
  getClusterServers,
} from "../store.server";
import { generateAppDefaultFqdn } from "../../app-subdomain";
import { APP_TEMPLATES, getRequiredDiskWithMargin } from "../../templates.data";
import { 
  sanitizeAndEnsureSecureEnvs, 
  isSecretKey, 
  isThirdPartyApiKey, 
  isInsecureOrPlaceholderValue, 
  generateSecureRandomSecret 
} from "../../secret-generator";

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
    const { resolveClientRoot } = await import("../../file-manager/security");
    const clientRoot = await resolveClientRoot(appId);
    const { scaffoldTemplateFiles, getTemplateStarterFiles } = await import("../../file-manager/template-definitions");
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
    const { deployTemplateStackToSwarm } = await import("../../swarm-cluster.server");
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
