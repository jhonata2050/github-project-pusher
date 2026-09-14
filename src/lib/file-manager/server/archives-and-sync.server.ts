import { verifyAppAuthorization, resolveClientRoot } from "../security";
import {
  compressRealItems,
  extractRealArchive,
  auditLogOperation,
} from "../filesystem";
import { verifyAppDiskQuota } from "./quota-and-read.server";
import type { IFileInfo } from "../types";

export async function compressAppItems(
  appId: string,
  paths: string[],
  archiveName: string,
  targetDir: string,
  userId: string
): Promise<IFileInfo> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await compressRealItems(clientRoot, paths, archiveName, targetDir);
  await auditLogOperation(userId, appId, "COMPRESS", { paths, archiveName, targetDir });
  return result;
}

export async function extractAppArchive(
  appId: string,
  archivePath: string,
  targetDir: string,
  userId: string
): Promise<{ extractedCount: number }> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const extractedCount = await extractRealArchive(clientRoot, archivePath, targetDir);
  await auditLogOperation(userId, appId, "EXTRACT", { archivePath, targetDir, extractedCount });
  await syncAppFilesToContainer(appId).catch((err: any) => console.warn("[extractAppArchive Sync Warning]:", err?.message));
  return { extractedCount };
}

export async function uploadAppFilesBatch(
  appId: string,
  targetDir: string,
  files: Array<{ name: string; contentBase64: string }>,
  userId: string
): Promise<{ savedCount: number; files: string[] }> {
  await verifyAppAuthorization(appId, userId);

  // Calcular tamanho total do lote e validar cota
  const totalBatchBytes = files.reduce((acc, f) => {
    const raw = (f.contentBase64 || "").replace(/^data:.*?;base64,/, "");
    return acc + Math.round(raw.length * 0.75);
  }, 0);
  await verifyAppDiskQuota(appId, totalBatchBytes, userId);

  const clientRoot = await resolveClientRoot(appId);
  const savedFiles: string[] = [];

  for (const item of files) {
    const cleanName = item.name.replace(/^[\/\\]+/, "");
    const fullPath = await (await import("../security")).validateSafePath(clientRoot, targetDir ? `${targetDir}/${cleanName}` : cleanName);
    const parentDir = (await import("path")).dirname(fullPath);
    if (!(await import("fs")).existsSync(parentDir)) {
      await (await import("fs/promises")).mkdir(parentDir, { recursive: true });
    }
    const cleanB64 = (item.contentBase64 || "").replace(/^data:.*?;base64,/, "");
    const buffer = cleanB64 ? Buffer.from(cleanB64, "base64") : Buffer.alloc(0);
    await (await import("fs/promises")).writeFile(fullPath, buffer);
    savedFiles.push(cleanName);
  }

  await auditLogOperation(userId, appId, "UPLOAD", { targetDir, filesCount: files.length, savedFiles });
  await syncAppFilesToContainer(appId).catch((err: any) => console.warn("[uploadAppFilesBatch Sync Warning]:", err?.message));
  return { savedCount: savedFiles.length, files: savedFiles };
}

export async function syncAppFilesToContainer(appId: string, _userId?: string): Promise<void> {
  try {
    const { getApplicationsStore, getActiveClusterServer } = await import("@/lib/cloud-apps.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const JSZip = (await import("jszip")).default;
    const fs = await import("fs/promises");
    const path = await import("path");

    const store = await getApplicationsStore();
    const app = store[appId];
    if (!app) return;

    const server = await getActiveClusterServer();
    const clientRoot = await resolveClientRoot(appId);
    const zip = new JSZip();

    async function addRecursive(d: string, rel: string = "") {
      const entries = await fs.readdir(d, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(d, ent.name);
        const r = rel ? `${rel}/${ent.name}` : ent.name;
        if (ent.isDirectory()) {
          await addRecursive(full, r);
        } else if (!ent.name.endsWith(".zip") && !ent.name.endsWith(".tar") && !ent.name.endsWith(".gz")) {
          const data = await fs.readFile(full);
          zip.file(r, data);
        }
      }
    }

    await addRecursive(clientRoot);
    const zipBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 1 } });

    // 1. Persistir cópia no Supabase Storage em segundo plano (não bloqueia o sync do contêiner)
    const bundlePath = `${appId}/site_bundle.zip`;
    supabaseAdmin.storage.from("app-bundles").upload(bundlePath, zipBuf, {
      contentType: "application/zip",
      upsert: true,
    }).catch((uploadErr: any) => console.warn("[Supabase Storage Backup Warning]:", uploadErr?.message));

    // 2. Sincronizar em tempo real no servidor remoto DK1 (bind-mounts, volumes e containers)
    try {
      const { syncFilesToSwarmContainer } = await import("@/lib/swarm-cluster.server");
      await syncFilesToSwarmContainer(app, zipBuf, server);
      console.log(`[FileManager Sync] Arquivos sincronizados com sucesso no cluster Swarm para app ${appId}`);
    } catch (swarmErr: any) {
      console.warn("[Cluster Live Auto-Sync Swarm]:", swarmErr.message);
    }
  } catch (err: any) {
    console.warn("[Cluster Live Auto-Sync]:", err.message);
  }
}
