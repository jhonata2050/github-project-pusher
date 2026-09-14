import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import JSZip from "jszip";
import type { AppFileItem } from "../types";
import { getCloudApplicationFiles } from "./read.server";

export async function uploadCloudApplicationZip(
  appId: string,
  fileName: string,
  zipBase64: string,
  autoExtract: boolean,
  userId: string
): Promise<{ files: AppFileItem[]; extractedCount: number }> {
  const cleanBase64 = zipBase64.replace(/^data:.*?;base64,/, "");
  const zipBuffer = Buffer.from(cleanBase64, "base64");

  const { verifyAppDiskQuota, syncAppFilesToContainer } = await import("../../file-manager/server");
  await verifyAppDiskQuota(appId, zipBuffer.length, userId);

  const { resolveClientRoot, validateSafePath } = await import("../../file-manager/security");
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
  const { resolveClientRoot, validateSafePath } = await import("../../file-manager/security");
  const clientRoot = await resolveClientRoot(appId);
  const fullPath = await validateSafePath(clientRoot, filePath);
  if (!fsSync.existsSync(fullPath)) {
    throw new Error("Arquivo ZIP não encontrado.");
  }

  const zipBuffer = await fs.readFile(fullPath);
  const result = await uploadCloudApplicationZip(appId, path.basename(filePath), zipBuffer.toString("base64"), true, userId);
  return result.files;
}
