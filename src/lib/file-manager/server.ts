import { verifyAppAuthorization, resolveClientRoot } from "./security";
import {
  listRealDirectory,
  readRealFileContent,
  writeRealFileContent,
  createRealFile,
  createRealDirectory,
  deleteRealItems,
  renameRealItem,
  copyRealItems,
  moveRealItems,
  chmodRealItem,
  compressRealItems,
  extractRealArchive,
  searchRealFiles,
  auditLogOperation,
  calculateDirectorySize,
} from "./filesystem";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getApplicationsStore } from "@/lib/cloud-apps.server";
import type {
  IFileListResult,
  IFileReadResult,
  IFileWriteResult,
  IFileInfo,
  IChmodResult,
} from "./types";

/**
 * Valida se a adição de novos bytes respeita a cota de disco do plano do cliente.
 */
export async function verifyAppDiskQuota(
  appId: string,
  additionalBytes: number,
  userId: string
): Promise<{ allowed: boolean; usedBytes: number; quotaBytes: number; planName: string }> {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  let diskQuotaMb = (app as any).disk_limit_mb;
  let planName = "Plano Cloud";

  if (app.service_id) {
    const { data: service } = await supabaseAdmin
      .from("services")
      .select("id, products(id, name, disk_quota_mb)")
      .eq("id", app.service_id)
      .maybeSingle();

    if (service?.products?.disk_quota_mb) {
      diskQuotaMb = service.products.disk_quota_mb;
    }
    if (service?.products?.name) {
      planName = service.products.name;
    }
  }

  // Fallback padrão se não configurado: 2.048 MB (2 GB)
  if (!diskQuotaMb || diskQuotaMb <= 0) {
    diskQuotaMb = 2048;
  }

  const quotaBytes = diskQuotaMb * 1024 * 1024;
  const clientRoot = await resolveClientRoot(appId);
  const currentUsedBytes = await calculateDirectorySize(clientRoot);

  if (currentUsedBytes + additionalBytes > quotaBytes) {
    const quotaFormatted = diskQuotaMb >= 1024 
      ? `${(diskQuotaMb / 1024).toFixed(1)} GB` 
      : `${diskQuotaMb} MB`;
    const usedFormatted = `${(currentUsedBytes / (1024 * 1024)).toFixed(1)} MB`;
    const attemptedFormatted = `${(additionalBytes / (1024 * 1024)).toFixed(1)} MB`;

    throw new Error(
      `Espaço em disco insuficiente. Seu plano (${planName}) permite até ${quotaFormatted}. ` +
      `Uso atual: ${usedFormatted}, tentativa de gravação: ${attemptedFormatted}. ` +
      `Faça um upgrade de plano para aumentar seu armazenamento.`
    );
  }

  return {
    allowed: true,
    usedBytes: currentUsedBytes,
    quotaBytes,
    planName,
  };
}

export async function listAppFiles(
  appId: string,
  relativePath: string = "",
  showHidden: boolean = true,
  userId: string
): Promise<IFileListResult> {
  const app = await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const { getTemplateContainerRoot } = await import("./template-definitions");
  const documentRoot = getTemplateContainerRoot(app.template_id, app.build_pack);
  return listRealDirectory(clientRoot, relativePath, showHidden, documentRoot);
}

export async function readAppFile(
  appId: string,
  filePath: string,
  userId: string
): Promise<IFileReadResult> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await readRealFileContent(clientRoot, filePath);
  await auditLogOperation(userId, appId, "READ", { path: filePath, size: result.size });
  return result;
}

export async function writeAppFile(
  appId: string,
  filePath: string,
  content: string,
  expectedSha256: string | undefined,
  force: boolean = false,
  userId: string
): Promise<IFileWriteResult> {
  await verifyAppAuthorization(appId, userId);
  const additionalBytes = new TextEncoder().encode(content).length;
  await verifyAppDiskQuota(appId, additionalBytes, userId);

  const clientRoot = await resolveClientRoot(appId);
  const result = await writeRealFileContent(clientRoot, filePath, content, expectedSha256, force);
  await auditLogOperation(userId, appId, "WRITE", { path: filePath, size: result.size, sha256: result.sha256 });

  // 1. Gravação direta no host e container Swarm (tempo real ~50ms)
  try {
    const store = await getApplicationsStore();
    const app = store[appId];
    if (app && app.status !== "provisioning") {
      const { writeRemoteSwarmFile } = await import("@/lib/swarm-cluster.server");
      await writeRemoteSwarmFile(app, filePath, content);
    }
  } catch (swarmErr: any) {
    console.warn("[writeAppFile Direct Swarm Warning]:", swarmErr.message);
  }

  // 2. Backup e sincronização em segundo plano
  syncAppFilesToContainer(appId).catch((err: any) => console.warn("[writeAppFile Sync Warning]:", err?.message));
  return result;
}

export async function createAppFile(
  appId: string,
  filePath: string,
  initialContent: string = "",
  userId: string
): Promise<IFileInfo> {
  await verifyAppAuthorization(appId, userId);
  const additionalBytes = new TextEncoder().encode(initialContent).length;
  await verifyAppDiskQuota(appId, additionalBytes, userId);

  const clientRoot = await resolveClientRoot(appId);
  const result = await createRealFile(clientRoot, filePath, initialContent);
  await auditLogOperation(userId, appId, "CREATE_FILE", { path: filePath });

  try {
    const store = await getApplicationsStore();
    const app = store[appId];
    if (app && app.status !== "provisioning") {
      const { writeRemoteSwarmFile } = await import("@/lib/swarm-cluster.server");
      await writeRemoteSwarmFile(app, filePath, initialContent);
    }
  } catch (swarmErr: any) {
    console.warn("[createAppFile Direct Swarm Warning]:", swarmErr.message);
  }

  syncAppFilesToContainer(appId).catch((err: any) => console.warn("[createAppFile Sync Warning]:", err?.message));
  return result;
}

export async function createAppDirectory(
  appId: string,
  dirPath: string,
  userId: string
): Promise<IFileInfo> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await createRealDirectory(clientRoot, dirPath);
  await auditLogOperation(userId, appId, "CREATE_DIR", { path: dirPath });

  try {
    const store = await getApplicationsStore();
    const app = store[appId];
    if (app && app.status !== "provisioning") {
      const { createRemoteSwarmDirectory } = await import("@/lib/swarm-cluster.server");
      await createRemoteSwarmDirectory(app, dirPath);
    }
  } catch (swarmErr: any) {
    console.warn("[createAppDirectory Direct Swarm Warning]:", swarmErr.message);
  }

  syncAppFilesToContainer(appId).catch((err: any) => console.warn("[createAppDirectory Sync Warning]:", err?.message));
  return result;
}

export async function deleteAppItems(
  appId: string,
  paths: string[],
  useTrash: boolean = false,
  userId: string
): Promise<{ deleted: string[]; failed: string[] }> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await deleteRealItems(clientRoot, paths, useTrash);
  await auditLogOperation(userId, appId, "DELETE", { paths, deleted: result.deleted, failed: result.failed });

  try {
    const store = await getApplicationsStore();
    const app = store[appId];
    if (app && app.status !== "provisioning" && result.deleted.length > 0) {
      const { deleteRemoteSwarmItems } = await import("@/lib/swarm-cluster.server");
      await deleteRemoteSwarmItems(app, result.deleted);
    }
  } catch (swarmErr: any) {
    console.warn("[deleteAppItems Direct Swarm Warning]:", swarmErr.message);
  }

  syncAppFilesToContainer(appId).catch((err: any) => console.warn("[deleteAppItems Sync Warning]:", err?.message));
  return result;
}

export async function renameAppItem(
  appId: string,
  oldPath: string,
  newName: string,
  userId: string
): Promise<IFileInfo> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await renameRealItem(clientRoot, oldPath, newName);
  await auditLogOperation(userId, appId, "RENAME", { oldPath, newName, newPath: result.path });
  await syncAppFilesToContainer(appId).catch((err: any) => console.warn("[renameAppItem Sync Warning]:", err?.message));
  return result;
}

export async function copyAppItems(
  appId: string,
  paths: string[],
  targetDir: string,
  userId: string
): Promise<string[]> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await copyRealItems(clientRoot, paths, targetDir);
  await auditLogOperation(userId, appId, "COPY", { paths, targetDir, copiedCount: result.length });
  await syncAppFilesToContainer(appId).catch((err: any) => console.warn("[copyAppItems Sync Warning]:", err?.message));
  return result;
}

export async function moveAppItems(
  appId: string,
  paths: string[],
  targetDir: string,
  userId: string
): Promise<string[]> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await moveRealItems(clientRoot, paths, targetDir);
  await auditLogOperation(userId, appId, "MOVE", { paths, targetDir, movedCount: result.length });
  await syncAppFilesToContainer(appId).catch((err: any) => console.warn("[moveAppItems Sync Warning]:", err?.message));
  return result;
}

export async function chmodAppItem(
  appId: string,
  filePath: string,
  modeOctal: string,
  userId: string
): Promise<IChmodResult> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  const result = await chmodRealItem(clientRoot, filePath, modeOctal);
  await auditLogOperation(userId, appId, "CHMOD", { path: filePath, permissions: modeOctal });
  return result;
}

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
    const fullPath = await (await import("./security")).validateSafePath(clientRoot, targetDir ? `${targetDir}/${cleanName}` : cleanName);
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

export async function searchAppFiles(
  appId: string,
  query: string,
  startDir: string = "",
  userId: string
): Promise<IFileInfo[]> {
  await verifyAppAuthorization(appId, userId);
  const clientRoot = await resolveClientRoot(appId);
  return searchRealFiles(clientRoot, query, startDir);
}
