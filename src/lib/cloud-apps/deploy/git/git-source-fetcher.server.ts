import type { ActiveDeploymentRecord } from "../../types";

export async function fetchGitSourceCode(
  cleanRepoUrl: string,
  branch: string,
  repoOwner: string,
  repoName: string,
  clientRoot: string,
  app: any,
  server: any,
  deploymentRecord: ActiveDeploymentRecord
): Promise<boolean> {
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
        process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
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
      const { getSshConnection, execSshCommand, pullRealFilesFromSwarm } = await import("../../../swarm-cluster.server");
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

  return downloadSuccess;
}
