import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import JSZip from "jszip";
import { supabaseAdmin } from "../../integrations/supabase/client.server";
import { getApplicationsStore } from "./store.server";
import type { AppFileItem } from "./types";

export async function getCloudApplicationFiles(appId: string, userId: string): Promise<AppFileItem[]> {
  const store = await getApplicationsStore();
  const app = store[appId];
  if (!app) throw new Error("Aplicação não encontrada");

  const { data: isStaff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (!isStaff && app.user_id !== userId) throw new Error("Acesso negado");

  const { resolveClientRoot } = await import("../file-manager/security");
  const clientRoot = await resolveClientRoot(appId);

  async function scanFiles(currentDir: string): Promise<AppFileItem[]> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    const items: AppFileItem[] = [];

    for (const ent of entries) {
      if (ent.name.startsWith(".") && ent.name !== ".env" && ent.name !== ".gitignore") continue;
      const fullPath = path.join(currentDir, ent.name);
      const relPath = path.relative(clientRoot, fullPath).replace(/\\/g, "/");

      if (ent.isDirectory()) {
        const subItems = await scanFiles(fullPath);
        items.push(...subItems);
      } else {
        const stat = await fs.stat(fullPath);
        let content = "";
        if (stat.size <= 512 * 1024) {
          try {
            content = await fs.readFile(fullPath, "utf-8");
          } catch (e) {}
        }
        const sizeFormatted = stat.size > 1024 * 1024
          ? `${(stat.size / (1024 * 1024)).toFixed(1)} MB`
          : stat.size > 1024
          ? `${(stat.size / 1024).toFixed(1)} KB`
          : `${stat.size} B`;

        items.push({
          name: ent.name,
          path: relPath,
          content,
          size: sizeFormatted,
          updated_at: stat.mtime.toISOString(),
          type: "file",
        });
      }
    }
    return items;
  }

  try {
    const diskItems = await scanFiles(clientRoot);
    if (diskItems.length > 0) {
      return diskItems;
    }
  } catch (e) {
    console.warn("[AppFiles] Falha ao escanear diretório no disco:", e);
  }

  const defaultIndex = path.join(clientRoot, "index.html");
  if (!fsSync.existsSync(defaultIndex)) {
    const initialContent = `<!DOCTYPE html>\n<html lang="pt-BR">\n<head><title>App Online</title></head>\n<body><h1>Aplicação Ativa</h1></body>\n</html>`;
    await fs.writeFile(defaultIndex, initialContent, "utf-8");
    return [{
      name: "index.html",
      path: "index.html",
      content: initialContent,
      size: "120 B",
      updated_at: new Date().toISOString(),
      type: "file",
    }];
  }

  return [];
}

export async function saveCloudApplicationFile(appId: string, filePath: string, content: string, userId: string): Promise<AppFileItem[]> {
  const sizeBytes = new TextEncoder().encode(content).length;
  const { verifyAppDiskQuota, syncAppFilesToContainer } = await import("../file-manager/server");
  await verifyAppDiskQuota(appId, sizeBytes, userId);

  const { resolveClientRoot, validateSafePath } = await import("../file-manager/security");
  const clientRoot = await resolveClientRoot(appId);
  const fullPath = await validateSafePath(clientRoot, filePath);

  const dir = path.dirname(fullPath);
  if (!fsSync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }

  await fs.writeFile(fullPath, content, "utf-8");
  
  const store = await getApplicationsStore();
  const app = store[appId];
  if (app) {
    const { writeRemoteSwarmFile } = await import("../swarm-cluster.server");
    await writeRemoteSwarmFile(app, filePath, content).catch((e: any) =>
      console.warn("[saveCloudApplicationFile Swarm Warning]:", e?.message)
    );
  }

  await syncAppFilesToContainer(appId, userId);

  return getCloudApplicationFiles(appId, userId);
}

export async function saveCloudApplicationFilesBatch(
  appId: string,
  filesToSave: Array<{ path: string; content: string }>,
  userId: string
): Promise<AppFileItem[]> {
  const totalBatchBytes = filesToSave.reduce((acc, f) => acc + new TextEncoder().encode(f.content).length, 0);
  const { verifyAppDiskQuota, syncAppFilesToContainer } = await import("../file-manager/server");
  await verifyAppDiskQuota(appId, totalBatchBytes, userId);

  const { resolveClientRoot, validateSafePath } = await import("../file-manager/security");
  const clientRoot = await resolveClientRoot(appId);

  const store = await getApplicationsStore();
  const app = store[appId];
  const { writeRemoteSwarmFile } = await import("../swarm-cluster.server");

  for (const item of filesToSave) {
    const fullPath = await validateSafePath(clientRoot, item.path);
    const dir = path.dirname(fullPath);
    if (!fsSync.existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(fullPath, item.content, "utf-8");
    if (app) {
      await writeRemoteSwarmFile(app, item.path, item.content).catch((e: any) =>
        console.warn("[saveBatch Swarm Warning]:", e?.message)
      );
    }
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

export async function deleteCloudApplicationFile(appId: string, filePath: string, userId: string): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("../file-manager/security");
  const { syncAppFilesToContainer } = await import("../file-manager/server");
  const clientRoot = await resolveClientRoot(appId);
  const fullPath = await validateSafePath(clientRoot, filePath);

  if (fsSync.existsSync(fullPath)) {
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
  }

  const store = await getApplicationsStore();
  const app = store[appId];
  if (app) {
    const { deleteRemoteSwarmItems } = await import("../swarm-cluster.server");
    await deleteRemoteSwarmItems(app, [filePath]).catch((e: any) =>
      console.warn("[delete Swarm Warning]:", e?.message)
    );
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

export async function uploadCloudApplicationZip(
  appId: string,
  fileName: string,
  zipBase64: string,
  autoExtract: boolean,
  userId: string
): Promise<{ files: AppFileItem[]; extractedCount: number }> {
  const cleanBase64 = zipBase64.replace(/^data:.*?;base64,/, "");
  const zipBuffer = Buffer.from(cleanBase64, "base64");

  const { verifyAppDiskQuota, syncAppFilesToContainer } = await import("../file-manager/server");
  await verifyAppDiskQuota(appId, zipBuffer.length, userId);

  const { resolveClientRoot, validateSafePath } = await import("../file-manager/security");
  const clientRoot = await resolveClientRoot(appId);

  const zip = await JSZip.loadAsync(zipBuffer);

  if (!autoExtract) {
    const cleanName = fileName.split("/").pop() || "arquivo.zip";
    const fullPath = await validateSafePath(clientRoot, cleanName);
    await fs.writeFile(fullPath, zipBuffer);
    await syncAppFilesToContainer(appId, userId);
    const files = await getCloudApplicationFiles(appId, userId);
    return { files, extractedCount: 1 };
  }

  const rawEntries = Object.keys(zip.files).filter(
    (name) => !zip.files[name]?.dir && !name.startsWith("__MACOSX/") && !name.includes(".DS_Store")
  );

  const firstEntry = rawEntries[0];
  if (!firstEntry) {
    throw new Error("O arquivo .zip não contém nenhum arquivo válido.");
  }

  const firstSlashIndex = firstEntry.indexOf("/");
  let commonPrefix = "";
  if (firstSlashIndex > 0) {
    const potentialPrefix = firstEntry.substring(0, firstSlashIndex + 1);
    if (rawEntries.every((name) => name.startsWith(potentialPrefix))) {
      commonPrefix = potentialPrefix;
    }
  }

  for (const filename of rawEntries) {
    const entry = zip.files[filename];
    if (!entry) continue;
    const cleanPath = commonPrefix ? filename.substring(commonPrefix.length) : filename;
    if (!cleanPath) continue;

    const fullPath = await validateSafePath(clientRoot, cleanPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const contentBuffer = await entry.async("nodebuffer");
    await fs.writeFile(fullPath, contentBuffer);
  }

  await syncAppFilesToContainer(appId, userId);
  const files = await getCloudApplicationFiles(appId, userId);
  return { files, extractedCount: rawEntries.length };
}

export async function extractCloudApplicationZip(
  appId: string,
  filePath: string,
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("../file-manager/security");
  const clientRoot = await resolveClientRoot(appId);
  const fullPath = await validateSafePath(clientRoot, filePath);
  if (!fsSync.existsSync(fullPath)) {
    throw new Error("Arquivo ZIP não encontrado.");
  }

  const zipBuffer = await fs.readFile(fullPath);
  const result = await uploadCloudApplicationZip(appId, path.basename(filePath), zipBuffer.toString("base64"), true, userId);
  return result.files;
}

export async function bulkDeleteCloudApplicationFiles(
  appId: string,
  filePaths: string[],
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("../file-manager/security");
  const { syncAppFilesToContainer } = await import("../file-manager/server");
  const clientRoot = await resolveClientRoot(appId);

  for (const p of filePaths) {
    try {
      const fullPath = await validateSafePath(clientRoot, p);
      if (fsSync.existsSync(fullPath)) {
        const stat = await fs.lstat(fullPath);
        if (stat.isDirectory()) {
          await fs.rm(fullPath, { recursive: true, force: true });
        } else {
          await fs.unlink(fullPath);
        }
      }
    } catch (e) {}
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

export async function createCloudApplicationFolder(
  appId: string,
  folderPath: string,
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("../file-manager/security");
  const { syncAppFilesToContainer } = await import("../file-manager/server");
  const clientRoot = await resolveClientRoot(appId);
  const fullPath = await validateSafePath(clientRoot, folderPath);

  if (!fsSync.existsSync(fullPath)) {
    await fs.mkdir(fullPath, { recursive: true });
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

export async function moveCloudApplicationFiles(
  appId: string,
  filePaths: string[],
  targetFolder: string,
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("../file-manager/security");
  const { syncAppFilesToContainer } = await import("../file-manager/server");
  const clientRoot = await resolveClientRoot(appId);
  const targetDir = await validateSafePath(clientRoot, targetFolder);

  if (!fsSync.existsSync(targetDir)) {
    await fs.mkdir(targetDir, { recursive: true });
  }

  for (const src of filePaths) {
    try {
      const srcFull = await validateSafePath(clientRoot, src);
      const fileName = path.basename(srcFull);
      const destFull = path.join(targetDir, fileName);
      await fs.rename(srcFull, destFull);
    } catch (e) {}
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

export async function copyCloudApplicationFiles(
  appId: string,
  filePaths: string[],
  targetFolder: string,
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("../file-manager/security");
  const { syncAppFilesToContainer } = await import("../file-manager/server");
  const clientRoot = await resolveClientRoot(appId);
  const targetDir = await validateSafePath(clientRoot, targetFolder);

  if (!fsSync.existsSync(targetDir)) {
    await fs.mkdir(targetDir, { recursive: true });
  }

  for (const src of filePaths) {
    try {
      const srcFull = await validateSafePath(clientRoot, src);
      const fileName = path.basename(srcFull);
      let destFull = path.join(targetDir, fileName);
      if (srcFull === destFull || fsSync.existsSync(destFull)) {
        destFull = path.join(targetDir, `copia_${fileName}`);
      }
      await fs.cp(srcFull, destFull, { recursive: true });
    } catch (e) {
      console.warn("[AppFiles] Erro ao copiar arquivo:", e);
    }
  }

  await syncAppFilesToContainer(appId, userId);
  return getCloudApplicationFiles(appId, userId);
}

