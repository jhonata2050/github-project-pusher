import type { ApplicationRecord, ClusterServerConfig } from "../cloud-apps.server";
import { getActiveClusterServer } from "../cloud-apps.server";
import { execSshCommand, getSshConnection } from "./swarm-transport.server";
import { sanitizeSecrets } from "../secret-sanitizer";
import { deployTemplateStackToSwarm } from "./swarm-deployer.server";

/**
 * Controla o ciclo de vida real dos serviços e containers no Docker Swarm
 * Ações suportadas:
 *  - stop: escala réplicas para 0 (libera memória e CPU)
 *  - start: escala réplicas para 1
 *  - restart: força atualização imediata (rolling restart do container)
 */
export async function manageSwarmServiceLifecycle(
  app: ApplicationRecord,
  action: "start" | "stop" | "restart",
  serverParam?: ClusterServerConfig
): Promise<{ success: boolean; services: string[]; message?: string }> {
  try {
    const server = serverParam || (await getActiveClusterServer());
    const hasSsh = Boolean(
      (server as any).sshPort ||
      (server as any).hasSwarm ||
      (server as any).sshPassword ||
      server.serverIp === "45.159.172.137"
    );

    if (!hasSsh) {
      return { success: false, services: [], message: "Servidor sem credenciais SSH configuradas." };
    }

    const conn = await getSshConnection(server);

    try {
      const { out: serviceListOut } = await execSshCommand(conn, 'docker service ls --format "{{.Name}}"');
      const swarmServices = serviceListOut.trim().split("\n").map((s) => s.trim()).filter(Boolean);

      const stackName = (app as any).stack_name;
      const cleanId = (app.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const cleanSvcId = (app.service_id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const appPrefix = (app.id || "").slice(0, 8);
      const svcPrefix = (app.service_id || "").slice(0, 8);

      const targetServices = swarmServices.filter((s) => {
        if (stackName && s.startsWith(stackName)) return true;
        if (cleanId && s.includes(cleanId)) return true;
        if (cleanSvcId && s.includes(cleanSvcId)) return true;
        if (appPrefix && s.includes(appPrefix)) return true;
        if (svcPrefix && s.includes(svcPrefix)) return true;
        return false;
      });

      if (targetServices.length === 0) {
        console.warn(`[SwarmLifecycle] Nenhum serviço Docker Swarm ativo encontrado para app ${app.id}`);
        conn.end();
        return { success: false, services: [], message: "Nenhum container ativo no Swarm." };
      }

      console.log(`[SwarmLifecycle] Executando '${action}' para: ${targetServices.join(", ")}`);

      if (action === "stop") {
        const scaleArgs = targetServices.map((s) => `${s}=0`).join(" ");
        await execSshCommand(conn, `docker service scale --detach ${scaleArgs}`);
      } else if (action === "start") {
        const scaleArgs = targetServices.map((s) => `${s}=1`).join(" ");
        await execSshCommand(conn, `docker service scale --detach ${scaleArgs}`);
      } else if (action === "restart") {
        if (app.template_id) {
          try {
            console.log(`[SwarmLifecycle] Reaplicando stack com variáveis atualizadas para app ${app.id} (${app.template_id})...`);
            const deployRes = await deployTemplateStackToSwarm(
              app,
              {
                id: app.template_id,
                build_pack: app.build_pack as any,
                name: app.name,
                default_envs: (app.env_vars as any) || [],
              } as any,
              server
            );
            if (deployRes.success) {
              conn.end();
              return { success: true, services: targetServices };
            }
          } catch (deployErr: any) {
            console.warn(`[SwarmLifecycle Redeploy Warning]:`, deployErr?.message);
          }
        }
        for (const s of targetServices) {
          await execSshCommand(conn, `docker service update --force --detach ${s}`);
        }
      }

      conn.end();
      return { success: true, services: targetServices };
    } catch (innerErr: any) {
      conn.end();
      throw innerErr;
    }
  } catch (err: any) {
    console.warn(`[SwarmLifecycle Error] Falha ao executar '${action}':`, err.message);
    return { success: false, services: [], message: err.message };
  }
}

/**
 * Remove definitivamente todos os serviços, stack, volumes e arquivos remotos de uma aplicação no Docker Swarm.
 * Usado para reset total (zerar o container para novo uso).
 */
export async function removeSwarmServiceAndStack(
  app: ApplicationRecord,
  serverParam?: ClusterServerConfig
): Promise<{ success: boolean; message?: string }> {
  try {
    const server = serverParam || (await getActiveClusterServer());
    const hasSsh = Boolean(
      (server as any).sshPort ||
      (server as any).hasSwarm ||
      (server as any).sshPassword ||
      server.serverIp === "45.159.172.137"
    );

    if (!hasSsh) {
      return { success: false, message: "Servidor sem SSH configurado." };
    }

    const conn = await getSshConnection(server);

    try {
      const cleanId = (app.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const cleanSvcId = (app.service_id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const stackName = (app as any).stack_name || `app_${cleanId}`;
      const appPrefix = (app.id || "").slice(0, 8);
      const svcPrefix = (app.service_id || "").slice(0, 8);

      console.log(`[SwarmStackRemoval] Removendo permanentemente stack ${stackName} (cleanId: ${cleanId}, svc: ${cleanSvcId})...`);

      // 1. Encontrar todos os serviços do Swarm relacionados e remover
      const { out: serviceListOut } = await execSshCommand(conn, 'docker service ls --format "{{.Name}}"');
      const swarmServices = serviceListOut.trim().split("\n").map((s) => s.trim()).filter(Boolean);
      const targetServices = swarmServices.filter((s) => {
        if (stackName && s.startsWith(stackName)) return true;
        if (cleanId && s.includes(cleanId)) return true;
        if (cleanSvcId && s.includes(cleanSvcId)) return true;
        if (appPrefix && s.includes(appPrefix)) return true;
        if (svcPrefix && s.includes(svcPrefix)) return true;
        return false;
      });

      if (targetServices.length > 0) {
        console.log(`[SwarmStackRemoval] Removendo serviços: ${targetServices.join(" ")}`);
        await execSshCommand(conn, `docker service rm ${targetServices.join(" ")} 2>/dev/null || true`);
      }

      // 2. Remover todas as stacks Docker associadas
      const { out: stackLsOut } = await execSshCommand(conn, 'docker stack ls --format "{{.Name}}"');
      const activeStacks = stackLsOut.trim().split("\n").map((s) => s.trim()).filter(Boolean);
      const matchedStacks = new Set<string>();
      if (stackName) matchedStacks.add(stackName);
      if (cleanId) matchedStacks.add(`app_${cleanId}`);
      if (cleanSvcId) matchedStacks.add(`app_${cleanSvcId}`);
      for (const st of activeStacks) {
        if (
          (appPrefix && st.startsWith(`app_${appPrefix}`)) ||
          (svcPrefix && st.startsWith(`app_${svcPrefix}`))
        ) {
          matchedStacks.add(st);
        }
      }

      for (const st of matchedStacks) {
        await execSshCommand(conn, `docker stack rm ${st} 2>/dev/null || true`);
      }

      // 3. Remover volumes nomeados associados a este app
      if (cleanId) await execSshCommand(conn, `docker volume rm $(docker volume ls -q --filter name=${cleanId}) 2>/dev/null || true`);
      if (cleanSvcId) await execSshCommand(conn, `docker volume rm $(docker volume ls -q --filter name=${cleanSvcId}) 2>/dev/null || true`);

      // 4. Limpar diretório do filesystem remoto
      for (const st of matchedStacks) {
        await execSshCommand(conn, `rm -rf /opt/stacks/${st} 2>/dev/null || true`);
      }

      conn.end();
      return { success: true };
    } catch (innerErr: any) {
      conn.end();
      throw innerErr;
    }
  } catch (err: any) {
    console.warn("[SwarmStackRemoval Warning]:", err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Obtém os logs reais stdout/stderr do serviço ou container no Docker Swarm.
 */
export async function getSwarmServiceLogs(
  app: ApplicationRecord,
  tail: number = 200,
  serverParam?: ClusterServerConfig
): Promise<string> {
  try {
    const server = serverParam || (await getActiveClusterServer());
    const hasSsh = Boolean(
      (server as any).sshPort ||
      (server as any).hasSwarm ||
      (server as any).sshPassword ||
      server.serverIp === "45.159.172.137"
    );

    if (!hasSsh) {
      return `[${new Date().toISOString()}] [Cluster DK1] Servidor sem SSH configurado.`;
    }

    const conn = await getSshConnection(server);

    try {
      const cleanId = (app.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const cleanSvcId = (app.service_id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const stackName = (app as any).stack_name || `app_${cleanId}`;
      const appPrefix = (app.id || "").slice(0, 8);
      const svcPrefix = (app.service_id || "").slice(0, 8);

      // Localizar serviços da stack
      const { out: serviceListOut } = await execSshCommand(conn, 'docker service ls --format "{{.Name}}"');
      const swarmServices = serviceListOut.trim().split("\n").map((s) => s.trim()).filter(Boolean);
      const appServices = swarmServices.filter(
        (s) =>
          (stackName && s.startsWith(stackName)) ||
          (cleanId && s.includes(cleanId)) ||
          (cleanSvcId && s.includes(cleanSvcId)) ||
          (appPrefix && s.includes(appPrefix)) ||
          (svcPrefix && s.includes(svcPrefix))
      );

      // Priorizar serviço web/app (que não seja apenas db/redis/pg)
      const primaryService =
        appServices.find((s) => !s.endsWith("_db") && !s.endsWith("_pg") && !s.endsWith("_redis")) ||
        appServices[0];

      let rawLogs = "";

      if (primaryService) {
        const { out: svcLogs } = await execSshCommand(
          conn,
          `docker service logs --tail ${tail} --timestamps ${primaryService} 2>&1`
        );
        rawLogs = svcLogs;
      }

      // Se service logs veio vazio ou erro, tentar container logs direto
      if (!rawLogs || rawLogs.trim().length === 0 || rawLogs.includes("no such service")) {
        const { out: containerId } = await execSshCommand(
          conn,
          `docker ps -a -q -f name=${cleanId} | head -n 1`
        );
        const cid = containerId.trim();
        if (cid) {
          const { out: cLogs } = await execSshCommand(
            conn,
            `docker logs --tail ${tail} --timestamps ${cid} 2>&1`
          );
          rawLogs = cLogs;
        }
      }

      conn.end();

      const cleaned = sanitizeSecrets((rawLogs || "").trim());
      if (!cleaned) {
        return `[${new Date().toISOString()}] [Docker Swarm] Serviço '${primaryService || stackName}' ativo. Aguardando novas saídas stdout/stderr do container...`;
      }

      return cleaned;
    } catch (innerErr: any) {
      conn.end();
      throw innerErr;
    }
  } catch (err: any) {
    console.warn(`[SwarmLogs Error] Falha ao obter logs para ${app.id}:`, err.message);
    return `[${new Date().toISOString()}] [Docker Swarm] Não foi possível carregar logs: ${err.message}`;
  }
}

/**
 * Atualiza os limites de recursos de CPU e Memória (cgroups) de um serviço diretamente no Docker Swarm.
 */
export async function syncSwarmServiceLimits(
  app: ApplicationRecord,
  serverParam?: ClusterServerConfig
): Promise<boolean> {
  try {
    const server = serverParam || (await getActiveClusterServer());
    const conn = await getSshConnection(server);

    const cleanId = (app.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    const stackName = (app as any).stack_name || `app_${cleanId}`;
    const cpuLimit = app.cpu_limit || 1.0;
    const memMb = app.memory_limit || 512;

    const { out } = await execSshCommand(conn, 'docker service ls --format "{{.Name}}"');
    const services = out.trim().split("\n").map((s) => s.trim()).filter(Boolean);
    const targetService = services.find(
      (s) => (s.startsWith(stackName) || s.includes(cleanId)) && !s.endsWith("_db") && !s.endsWith("_pg") && !s.endsWith("_redis")
    );

    if (targetService) {
      await execSshCommand(
        conn,
        `docker service update --detach --limit-cpu ${cpuLimit} --limit-memory ${memMb}M ${targetService}`
      );
      console.log(`[SwarmLimits] Limites atualizados para ${targetService}: ${cpuLimit} vCPU, ${memMb}MB RAM`);
    }

    conn.end();
    return true;
  } catch (err: any) {
    console.warn("[SwarmLimits Warning]:", err.message);
    return false;
  }
}
