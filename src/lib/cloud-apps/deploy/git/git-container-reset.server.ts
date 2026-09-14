import { supabaseAdmin } from "../../../../integrations/supabase/client.server";
import type { ActiveDeploymentRecord } from "../../types";

export async function resetPreviousGitDeploy(
  app: any,
  appId: string,
  clientRoot: string,
  server: any,
  deploymentRecord: ActiveDeploymentRecord
) {
  deploymentRecord.step = 2;
  deploymentRecord.logs.push({
    output: `[2/6] Resetando container e limpando arquivos anteriores do serviço '${app.name}'...`,
    type: "stdout",
  });
  deploymentRecord.updatedAt = new Date().toISOString();

  // Limpar arquivos locais em clientRoot (preservando .env se houver)
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

  // Limpar cache de arquivos no banco
  try {
    await supabaseAdmin.from("system_settings").delete().eq("key", `app_files_${appId}`);
  } catch {}

  // Se havia stack Docker Swarm rodando, remover serviços e arquivos antigos no cluster remoto
  const cleanId = (app.id || appId || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  const stackName = (app as any).stack_name || `app_${cleanId}`;
  if (stackName) {
    try {
      const { getSshConnection, execSshCommand } = await import("../../../swarm-cluster.server");
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
