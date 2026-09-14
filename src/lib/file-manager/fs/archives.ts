import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import JSZip from "jszip";
import { validateSafePath, sanitizeFileName } from "../security.ts";
import { buildFileInfo } from "./meta.ts";
import type { IFileInfo } from "../types.ts";

/**
 * COMPACTAÇÃO REAL DE ARQUIVOS EM ZIP
 */
export async function compressRealItems(
  clientRoot: string,
  relativePaths: string[],
  archiveName: string,
  targetDirRelative: string = ""
): Promise<IFileInfo> {
  const cleanName = sanitizeFileName(archiveName.endsWith(".zip") ? archiveName : `${archiveName}.zip`);
  const targetDir = await validateSafePath(clientRoot, targetDirRelative);
  const archivePath = path.join(targetDir, cleanName);

  const zip = new JSZip();

  async function addRecursively(zipFolder: JSZip, fullSrc: string, relSrc: string) {
    const stats = await fs.lstat(fullSrc);
    if (stats.isDirectory()) {
      const entries = await fs.readdir(fullSrc);
      const subFolder = zipFolder.folder(path.basename(fullSrc));
      if (subFolder) {
        for (const entry of entries) {
          await addRecursively(subFolder, path.join(fullSrc, entry), path.join(relSrc, entry));
        }
      }
    } else {
      const data = await fs.readFile(fullSrc);
      zipFolder.file(path.basename(fullSrc), data);
    }
  }

  for (const rel of relativePaths) {
    const full = await validateSafePath(clientRoot, rel);
    if (fsSync.existsSync(full)) {
      await addRecursively(zip, full, rel);
    }
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await fs.writeFile(archivePath, buffer);

  return buildFileInfo(clientRoot, archivePath);
}

/**
 * EXTRAÇÃO REAL DE PACOTE ZIP NO FILESYSTEM COM BLINDAGEM CONTRA ZIP SLIP (Lei #5)
 */
export async function extractRealArchive(
  clientRoot: string,
  archiveRelativePath: string,
  targetDirRelative: string = ""
): Promise<number> {
  const archivePath = await validateSafePath(clientRoot, archiveRelativePath);
  if (!fsSync.existsSync(archivePath)) {
    throw new Error("Arquivo compactado não encontrado.");
  }

  const targetDir = await validateSafePath(clientRoot, targetDirRelative);
  if (!fsSync.existsSync(targetDir)) {
    await fs.mkdir(targetDir, { recursive: true });
  }

  const buffer = await fs.readFile(archivePath);
  const zip = await JSZip.loadAsync(buffer);

  let extractedCount = 0;
  for (const [entryName, entry] of Object.entries(zip.files)) {
    if (entry.dir || entryName.startsWith("__MACOSX/") || entryName.includes(".DS_Store")) {
      continue;
    }

    const resolvedDest = path.resolve(targetDir, entryName);
    const relCheck = path.relative(targetDir, resolvedDest);
    // Verificação rigorosa contra Zip Slip (path traversal dentro do zip)
    if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
      console.warn(`[Zip Slip Attack Bloqueado]: ${entryName}`);
      continue;
    }

    const safeDestPath = resolvedDest;

    const parent = path.dirname(safeDestPath);
    if (!fsSync.existsSync(parent)) {
      await fs.mkdir(parent, { recursive: true });
    }

    const data = await entry.async("nodebuffer");
    await fs.writeFile(safeDestPath, data);
    extractedCount++;
  }

  return extractedCount;
}
