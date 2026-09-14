import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import crypto from "crypto";
import { validateSafePath, sanitizeFileName } from "../security.ts";
import { buildFileInfo, formatBytes, parsePermissions } from "./meta.ts";
import type {
  IFileInfo,
  IFileWriteResult,
  IChmodResult,
} from "../types.ts";

/**
 * ESCRITA REAL DE ARQUIVO (com salvamento atômico e verificação de concorrência)
 */
export async function writeRealFileContent(
  clientRoot: string,
  relativePath: string,
  content: string,
  expectedSha256?: string,
  force: boolean = false
): Promise<IFileWriteResult> {
  const fullPath = await validateSafePath(clientRoot, relativePath);

  // Verificação de concorrência se o arquivo já existir
  if (fsSync.existsSync(fullPath) && expectedSha256 && !force) {
    const currentBuf = await fs.readFile(fullPath);
    const currentSha256 = crypto.createHash("sha256").update(currentBuf).digest("hex");
    if (currentSha256 !== expectedSha256) {
      throw new Error("CONCURRENCY_CONFLICT: O arquivo foi modificado no servidor por outro processo.");
    }
  }

  // Salvamento atômico via arquivo temporário para evitar corrupção
  const tempPath = `${fullPath}.eqsam_tmp_${Date.now()}`;
  await fs.writeFile(tempPath, content, "utf-8");
  await fs.rename(tempPath, fullPath);

  const stats = await fs.stat(fullPath);
  const newBuf = Buffer.from(content, "utf-8");
  const newSha256 = crypto.createHash("sha256").update(newBuf).digest("hex");

  return {
    success: true,
    path: path.relative(clientRoot, fullPath).replace(/\\/g, "/"),
    size: stats.size,
    sizeFormatted: formatBytes(stats.size),
    mtime: stats.mtime.toISOString(),
    sha256: newSha256,
  };
}

/**
 * CRIAÇÃO REAL DE NOVO ARQUIVO
 */
export async function createRealFile(
  clientRoot: string,
  relativePath: string,
  initialContent: string = ""
): Promise<IFileInfo> {
  const fullPath = await validateSafePath(clientRoot, relativePath);
  if (fsSync.existsSync(fullPath)) {
    throw new Error("Já existe um arquivo ou diretório com este nome.");
  }

  const dir = path.dirname(fullPath);
  if (!fsSync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }

  await fs.writeFile(fullPath, initialContent, "utf-8");
  return buildFileInfo(clientRoot, fullPath);
}

/**
 * CRIAÇÃO REAL DE NOVA PASTA / DIRETÓRIO
 */
export async function createRealDirectory(
  clientRoot: string,
  relativePath: string
): Promise<IFileInfo> {
  const fullPath = await validateSafePath(clientRoot, relativePath);
  if (fsSync.existsSync(fullPath)) {
    throw new Error("Já existe um diretório ou arquivo com este nome.");
  }

  await fs.mkdir(fullPath, { recursive: true });
  return buildFileInfo(clientRoot, fullPath);
}

/**
 * EXCLUSÃO REAL DE ARQUIVOS E DIRETÓRIOS
 */
export async function deleteRealItems(
  clientRoot: string,
  relativePaths: string[],
  useTrash: boolean = false
): Promise<{ deleted: string[]; failed: string[] }> {
  // Filtrar caminhos redundantes (se uma pasta pai foi selecionada, ignora os filhos já inclusos nela)
  const uniquePaths = Array.from(new Set(relativePaths.map((p) => p.replace(/\\/g, "/").replace(/^\/+/, ""))));
  const rootPaths = uniquePaths.filter(
    (p) => !uniquePaths.some((other) => other !== p && p.startsWith(other + "/"))
  );

  const deleted: string[] = [];
  const failed: string[] = [];

  for (const relPath of rootPaths) {
    try {
      const fullPath = await validateSafePath(clientRoot, relPath);
      if (!fsSync.existsSync(fullPath)) continue;

      if (useTrash) {
        const trashDir = path.join(clientRoot, ".trash");
        if (!fsSync.existsSync(trashDir)) {
          await fs.mkdir(trashDir, { recursive: true });
        }
        const targetTrash = path.join(trashDir, `${Date.now()}_${path.basename(fullPath)}`);
        try {
          await fs.rename(fullPath, targetTrash);
        } catch {
          await fs.cp(fullPath, targetTrash, { recursive: true, force: true });
          await fs.rm(fullPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
      } else {
        await fs.rm(fullPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      }
      deleted.push(relPath);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        console.error(`[FileManager Delete Error] ${relPath}:`, err);
        failed.push(relPath);
      } else {
        deleted.push(relPath);
      }
    }
  }

  return { deleted, failed };
}

/**
 * RENOMEAÇÃO REAL DE ITEM
 */
export async function renameRealItem(
  clientRoot: string,
  oldRelativePath: string,
  newName: string
): Promise<IFileInfo> {
  const cleanName = sanitizeFileName(newName);
  const oldFullPath = await validateSafePath(clientRoot, oldRelativePath);
  if (!fsSync.existsSync(oldFullPath)) {
    throw new Error("O arquivo ou diretório de origem não foi encontrado.");
  }

  const dir = path.dirname(oldFullPath);
  const newFullPath = path.join(dir, cleanName);

  if (fsSync.existsSync(newFullPath)) {
    throw new Error("Já existe um item com o novo nome informado.");
  }

  try {
    await fs.rename(oldFullPath, newFullPath);
  } catch {
    await fs.cp(oldFullPath, newFullPath, { recursive: true, force: true });
    await fs.rm(oldFullPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  return buildFileInfo(clientRoot, newFullPath);
}

/**
 * CÓPIA REAL DE ARQUIVOS / DIRETÓRIOS
 */
export async function copyRealItems(
  clientRoot: string,
  relativePaths: string[],
  targetDirRelative: string = ""
): Promise<string[]> {
  const destDir = await validateSafePath(clientRoot, targetDirRelative);
  if (!fsSync.existsSync(destDir)) {
    await fs.mkdir(destDir, { recursive: true });
  }

  const uniquePaths = Array.from(new Set(relativePaths.map((p) => p.replace(/\\/g, "/").replace(/^\/+/, ""))));
  const rootPaths = uniquePaths.filter(
    (p) => !uniquePaths.some((other) => other !== p && p.startsWith(other + "/"))
  );

  const copied: string[] = [];
  for (const rel of rootPaths) {
    const src = await validateSafePath(clientRoot, rel);
    if (!fsSync.existsSync(src)) continue;

    const baseName = path.basename(src);
    let dest = path.join(destDir, baseName);

    // Se for copiado para o mesmo diretório, gera nome com prefixo de cópia
    if (src === dest) {
      const ext = path.extname(baseName);
      const nameWithoutExt = path.basename(baseName, ext);
      dest = path.join(destDir, `${nameWithoutExt}_copia${ext}`);
    }

    await fs.cp(src, dest, { recursive: true, force: true });
    copied.push(path.relative(clientRoot, dest).replace(/\\/g, "/"));
  }

  return copied;
}

/**
 * MOVIMENTAÇÃO REAL DE ARQUIVOS / DIRETÓRIOS
 */
export async function moveRealItems(
  clientRoot: string,
  relativePaths: string[],
  targetDirRelative: string = ""
): Promise<string[]> {
  const destDir = await validateSafePath(clientRoot, targetDirRelative);
  if (!fsSync.existsSync(destDir)) {
    await fs.mkdir(destDir, { recursive: true });
  }

  const uniquePaths = Array.from(new Set(relativePaths.map((p) => p.replace(/\\/g, "/").replace(/^\/+/, ""))));
  const rootPaths = uniquePaths.filter(
    (p) => !uniquePaths.some((other) => other !== p && p.startsWith(other + "/"))
  );

  const moved: string[] = [];
  for (const rel of rootPaths) {
    const src = await validateSafePath(clientRoot, rel);
    if (!fsSync.existsSync(src)) continue;

    const baseName = path.basename(src);
    const dest = path.join(destDir, baseName);

    if (src !== dest) {
      try {
        await fs.rename(src, dest);
      } catch {
        // Fallback robusto com fs.cp e fs.rm resiliente
        await fs.cp(src, dest, { recursive: true, force: true });
        try {
          await fs.rm(src, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        } catch (rmErr: any) {
          if (rmErr.code !== "ENOENT") {
            console.warn(`[FileManager move warning on rm]:`, rmErr.message);
          }
        }
      }
      moved.push(path.relative(clientRoot, dest).replace(/\\/g, "/"));
    }
  }

  return moved;
}

/**
 * ALTERAÇÃO REAL DE PERMISSÕES LINUX (CHMOD)
 */
export async function chmodRealItem(
  clientRoot: string,
  relativePath: string,
  modeOctal: string
): Promise<IChmodResult> {
  const fullPath = await validateSafePath(clientRoot, relativePath);
  if (!fsSync.existsSync(fullPath)) {
    throw new Error("Arquivo ou diretório não encontrado.");
  }

  const cleanOctal = modeOctal.replace(/^0+/, "") || "0";
  const modeInt = parseInt(cleanOctal, 8);
  if (isNaN(modeInt) || modeInt < 0 || modeInt > 0o777) {
    throw new Error("Permissão octal inválida. Use valores como 0755, 0644, 0600.");
  }

  try {
    await fs.chmod(fullPath, modeInt);
  } catch (e: any) {
    // No Windows chmod possui suporte limitado para bits de escrita, mas aceita chamadas
    console.warn(`[Chmod Info] fs.chmod(${fullPath}, ${modeOctal}):`, e.message);
  }

  const stats = await fs.stat(fullPath);
  const { octal, rwx } = parsePermissions(stats.mode, stats.isDirectory());

  return {
    path: relativePath,
    permissions: octal,
    rwx,
  };
}
