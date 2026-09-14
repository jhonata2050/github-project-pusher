import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import type { AppFileItem } from "../types";
import { getCloudApplicationFiles } from "./read.server";

export async function createCloudApplicationFolder(
  appId: string,
  folderPath: string,
  userId: string
): Promise<AppFileItem[]> {
  const { resolveClientRoot, validateSafePath } = await import("../../file-manager/security");
  const { syncAppFilesToContainer } = await import("../../file-manager/server");
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
  const { resolveClientRoot, validateSafePath } = await import("../../file-manager/security");
  const { syncAppFilesToContainer } = await import("../../file-manager/server");
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
  const { resolveClientRoot, validateSafePath } = await import("../../file-manager/security");
  const { syncAppFilesToContainer } = await import("../../file-manager/server");
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
