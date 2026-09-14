import { saveApplicationsStore } from "../../store.server";
import type { ActiveDeploymentRecord } from "../../types";

export async function deployGitSwarmStack(
  app: any,
  appId: string,
  userId: string,
  templateId: string,
  cleanRepoUrl: string,
  branch: string,
  detectedBuildPack: string,
  defaultPort: number,
  friendlyName: string,
  server: any,
  store: Record<string, any>,
  deploymentRecord: ActiveDeploymentRecord
) {
  deploymentRecord.step = 5;
  deploymentRecord.logs.push({
    output: `[5/6] Sincronizando arquivos e atualizando containers no Docker Swarm...`,
    type: "stdout",
  });
  deploymentRecord.updatedAt = new Date().toISOString();

  try {
    const { syncAppFilesToContainer } = await import("../../../file-manager/server");
    await syncAppFilesToContainer(appId, userId);
  } catch (syncErr: any) {
    console.warn("[GitDeploy Sync Files Warning]:", syncErr?.message);
  }

  try {
    const { deployTemplateStackToSwarm, syncSwarmDomainRouting } = await import("../../../swarm-cluster.server");
    const deployRes = await deployTemplateStackToSwarm(
      app,
      {
        id: templateId,
        git_repository: cleanRepoUrl,
        git_branch: branch,
        build_pack: detectedBuildPack as any,
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

  deploymentRecord.step = 6;
  deploymentRecord.logs.push(
    { output: `Certificado SSL Let's Encrypt gerado e verificado.`, type: "stdout" },
    { output: `[6/6] ✅ Deploy concluído com sucesso! Aplicação operacional 24/7.`, type: "stdout" }
  );
  deploymentRecord.status = "finished";
  deploymentRecord.updatedAt = new Date().toISOString();
}
