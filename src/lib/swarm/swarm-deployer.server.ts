import type { ApplicationRecord, ClusterServerConfig } from "../cloud-apps.server";
import { getActiveClusterServer } from "../cloud-apps.server";
import { generateAppDefaultFqdn, extractAppHash12 } from "../app-subdomain";
import type { DeploymentRuntime } from "../templates.data";
import { generateSecureRandomSecret, isInsecureOrPlaceholderValue } from "../secret-generator";
import { execSshCommand, getSshConnection } from "./swarm-transport.server";
import { writeStarterFilesIfEmpty } from "./templates/bootstrap-files";
import { buildTemplateComposeYaml } from "./templates/compose-builder";
import { runPostDeployHooks } from "./templates/post-deploy";
import type { TemplateLimits, TemplateContext } from "./templates/types";
import { Buffer } from "buffer";

/**
 * Realiza o deploy real de uma stack de modelo no Docker Swarm com Traefik, SSL Let's Encrypt e arquivos
 */
export async function deployTemplateStackToSwarm(
  app: ApplicationRecord,
  template: {
    id?: string | undefined;
    git_repository?: string | undefined;
    git_branch?: string | undefined;
    build_pack?: "nixpacks" | "dockerfile" | "dockercompose" | "static" | undefined;
    runtime?: DeploymentRuntime | undefined;
    default_envs?: Array<{ key: string; value: string }> | undefined;
    default_port?: number | undefined;
    name?: string | undefined;
  },
  serverParam?: ClusterServerConfig | undefined
): Promise<{ success: boolean; stackName: string; fqdn: string; message?: string | undefined }> {
  try {
    const server = serverParam || (await getActiveClusterServer());
    const hasSsh = Boolean(
      (server as any).sshPort ||
      (server as any).hasSwarm ||
      (server as any).sshPassword ||
      server.serverIp === "45.159.172.137"
    );

    if (!hasSsh) {
      return { success: false, stackName: "", fqdn: "", message: "Servidor sem credenciais SSH configuradas." };
    }

    const conn = await getSshConnection(server);

    try {
      const cleanId = extractAppHash12(app.id || app.service_id);
      const stackName = `app_${cleanId}`;
      (app as any).stack_name = stackName;

      const wildcard = server.wildcardDomain || "dk1.eqsam.com";
      const defaultFqdn = generateAppDefaultFqdn(app, wildcard);
      const cleanHost = (app.fqdn || defaultFqdn).replace(/^https?:\/\//i, "").replace(/\/+$/, "");

      const templateId = (template.id || app.template_id || "").toLowerCase();
      const totalMemNum = typeof app.memory_limit === "number" && app.memory_limit > 0 ? app.memory_limit : 512;
      const totalCpuNum = typeof app.cpu_limit === "number" && app.cpu_limit > 0 ? app.cpu_limit : 0.5;

      const limits: TemplateLimits = {
        memLimit: `${totalMemNum}M`,
        cpuLimit: `${totalCpuNum}`,
        // Multi-container proportional budgeting
        tbBuilderMem: `${Math.max(256, Math.floor(totalMemNum * 0.45))}M`,
        tbBuilderCpu: `${Math.max(0.2, Number((totalCpuNum * 0.45).toFixed(2)))}`,
        tbViewerMem: `${Math.max(192, Math.floor(totalMemNum * 0.35))}M`,
        tbViewerCpu: `${Math.max(0.15, Number((totalCpuNum * 0.35).toFixed(2)))}`,
        tbDbMem: `${Math.max(128, Math.floor(totalMemNum * 0.20))}M`,
        tbDbCpu: `${Math.max(0.1, Number((totalCpuNum * 0.20).toFixed(2)))}`,
        // Web Apps with DB (WordPress, N8N)
        appWpMem: `${Math.max(256, Math.floor(totalMemNum * 0.70))}M`,
        appWpCpu: `${Math.max(0.3, Number((totalCpuNum * 0.70).toFixed(2)))}`,
        dbWpMem: `${Math.max(256, Math.floor(totalMemNum * 0.30))}M`,
        dbWpCpu: `${Math.max(0.2, Number((totalCpuNum * 0.30).toFixed(2)))}`,
        // Standalone DBs + Web UI
        dbMem: `${Math.max(256, Math.floor(totalMemNum * 0.80))}M`,
        dbCpu: `${Math.max(0.3, Number((totalCpuNum * 0.80).toFixed(2)))}`,
        adminerMem: `${Math.max(128, Math.floor(totalMemNum * 0.20))}M`,
        adminerCpu: `${Math.max(0.1, Number((totalCpuNum * 0.20).toFixed(2)))}`,
        // OpenStatus
        osAppMem: `${Math.max(512, Math.floor(totalMemNum * 0.40))}M`,
        osAppCpu: `${Math.max(0.4, Number((totalCpuNum * 0.40).toFixed(2)))}`,
        osDashMem: `${Math.max(512, Math.floor(totalMemNum * 0.40))}M`,
        osDashCpu: `${Math.max(0.4, Number((totalCpuNum * 0.40).toFixed(2)))}`,
        osDbMem: `${Math.max(128, Math.floor(totalMemNum * 0.20))}M`,
        osDbCpu: `${Math.max(0.1, Number((totalCpuNum * 0.20).toFixed(2)))}`,
      };

      // Diretório no host remoto Linux
      const stackDir = `/opt/stacks/${stackName}`;
      await execSshCommand(conn, `mkdir -p ${stackDir}/html ${stackDir}/data`);

      // Sincronizar arquivos do banco de dados (se houver)
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: dbFiles } = await supabaseAdmin
          .from("system_settings")
          .select("value")
          .eq("key", `app_files_${app.id}`)
          .maybeSingle();

        const fileList = typeof dbFiles?.value === "string" ? JSON.parse(dbFiles.value) : dbFiles?.value || [];
        if (Array.isArray(fileList) && fileList.length > 0) {
          for (const f of fileList) {
            if (f.content) {
              const b64 = Buffer.from(f.content).toString("base64");
              const relPath = f.name || f.path || "index.html";
              const targetPath = `${stackDir}/html/${relPath}`;
              const targetDir = targetPath.substring(0, targetPath.lastIndexOf("/"));
              await execSshCommand(conn, `mkdir -p ${targetDir} && echo "${b64}" | base64 -d > ${targetPath}`);
            }
          }
        } else {
          // Gravação de starter inteligente dependendo da stack quando não há arquivos
          await writeStarterFilesIfEmpty(conn, stackDir, templateId, app);
        }
      } catch (fErr: any) {
        console.warn(`[deployTemplateStackToSwarm] Aviso ao sincronizar arquivos:`, fErr?.message);
      }

      const getEnv = (key: string, fallback?: string): string => {
        const found = (app.env_vars || []).find((e) => e.key === key)?.value;
        if (found !== undefined && found !== null && String(found).trim() !== "") {
          const s = String(found).trim();
          if (!isInsecureOrPlaceholderValue(key, s)) {
            return s;
          }
        }
        if (fallback !== undefined && fallback !== null && !isInsecureOrPlaceholderValue(key, fallback)) {
          return fallback;
        }
        return generateSecureRandomSecret(key);
      };

      const ctx: TemplateContext = {
        cleanId,
        stackName,
        cleanHost,
        templateId,
        app,
        server,
        wildcard,
        stackDir,
        template,
        getEnv,
        limits,
      };

      const composeYaml = await buildTemplateComposeYaml(conn, ctx);

      // Salvar o docker-compose.yml no host remoto
      const b64Compose = Buffer.from(composeYaml).toString("base64");
      await execSshCommand(conn, `echo "${b64Compose}" | base64 -d > ${stackDir}/docker-compose.yml`);

      // Limpeza garantida de serviços obsoletos de templates anteriores que não existem mais neste compose
      try {
        const { out: activeSvcs } = await execSshCommand(
          conn,
          `docker service ls --filter name=${stackName}_ --format '{{.Name}}'`
        );
        const currentServices = activeSvcs.trim().split("\n").map((s) => s.trim()).filter(Boolean);
        for (const s of currentServices) {
          const baseName = s.replace(`${stackName}_`, "");
          if (!composeYaml.includes(`${baseName}:`)) {
            console.log(`[deployTemplateStackToSwarm] Removendo serviço obsoleto conflitante: ${s}`);
            await execSshCommand(conn, `docker service rm ${s} 2>/dev/null || true`);
          }
        }
      } catch (svcCleanErr: any) {
        console.warn(`[deployTemplateStackToSwarm Warning ao limpar serviços obsoletos]:`, svcCleanErr?.message);
      }

      // Executar docker stack deploy com --prune
      console.log(`[deployTemplateStackToSwarm] Disparando docker stack deploy --prune para ${stackName}...`);
      const deployRes = await execSshCommand(conn, `docker stack deploy --prune -c ${stackDir}/docker-compose.yml ${stackName}`);
      console.log(`[deployTemplateStackToSwarm] Saída do deploy:`, deployRes.out);

      // Executar hooks adicionais específicos (como migrações LibSQL do OpenStatus)
      await runPostDeployHooks(conn, templateId, app, server, cleanId, stackName, cleanHost);

      conn.end();
      return { success: true, stackName, fqdn: defaultFqdn };
    } catch (innerErr: any) {
      conn.end();
      throw innerErr;
    }
  } catch (err: any) {
    console.warn(`[deployTemplateStackToSwarm Error]:`, err.message);
    return { success: false, stackName: "", fqdn: "", message: err.message };
  }
}
