import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import crypto from "crypto";
import JSZip from "jszip";
import { supabaseAdmin } from "../../integrations/supabase/client.server";
import { validateSafePath, sanitizeFileName } from "./security";
import type {
  IFileInfo,
  IFileListResult,
  IFileReadResult,
  IFileWriteResult,
  IChmodResult,
  FileType,
} from "./types";

/** Formata bytes para exibição humana (B, KB, MB, GB) */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Determina o MIME type a partir da extensão */
export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase().replace(".", "");
  const mimeMap: Record<string, string> = {
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "application/javascript",
    ts: "application/typescript",
    jsx: "text/jsx",
    tsx: "text/tsx",
    json: "application/json",
    php: "application/x-httpd-php",
    py: "text/x-python",
    sh: "application/x-sh",
    sql: "application/sql",
    md: "text/markdown",
    txt: "text/plain",
    xml: "application/xml",
    yml: "text/yaml",
    yaml: "text/yaml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",
    zip: "application/zip",
    tar: "application/x-tar",
    gz: "application/gzip",
    pdf: "application/pdf",
  };
  return mimeMap[ext] || "application/octet-stream";
}

/** Converte modo numérico do Linux para octal ("0755", "0644") e string ("-rwxr-xr-x") */
export function parsePermissions(mode: number, isDirectory: boolean): { octal: string; rwx: string } {
  const octal = (mode & 0o777).toString(8).padStart(4, "0");
  const flags = [
    mode & 0o400 ? "r" : "-",
    mode & 0o200 ? "w" : "-",
    mode & 0o100 ? "x" : "-",
    mode & 0o040 ? "r" : "-",
    mode & 0o020 ? "w" : "-",
    mode & 0o010 ? "x" : "-",
    mode & 0o004 ? "r" : "-",
    mode & 0o002 ? "w" : "-",
    mode & 0o001 ? "x" : "-",
  ].join("");
  const rwx = (isDirectory ? "d" : "-") + flags;
  return { octal, rwx };
}

/**
 * Cria informações detalhadas de um arquivo ou diretório a partir de stat real
 */
async function buildFileInfo(clientRoot: string, fullPath: string): Promise<IFileInfo> {
  const relativePath = path.relative(clientRoot, fullPath).replace(/\\/g, "/");
  const stats = await fs.lstat(fullPath);
  const isDirectory = stats.isDirectory();
  const isSymlink = stats.isSymbolicLink();
  const fileName = path.basename(fullPath);
  const isHidden = fileName.startsWith(".");
  const { octal, rwx } = parsePermissions(stats.mode, isDirectory);

  let symlinkTarget: string | undefined;
  if (isSymlink) {
    try {
      symlinkTarget = await fs.readlink(fullPath);
    } catch (e) {}
  }

  let type: FileType = "file";
  if (isDirectory) type = "directory";
  else if (isSymlink) type = "symlink";

  return {
    name: fileName,
    path: relativePath,
    type,
    size: isDirectory ? 4096 : stats.size,
    sizeFormatted: isDirectory ? "Pasta" : formatBytes(stats.size),
    mtime: stats.mtime.toISOString(),
    birthtime: stats.birthtime?.toISOString(),
    permissions: octal,
    rwx,
    mimeType: isDirectory ? "inode/directory" : getMimeType(fileName),
    isHidden,
    isSymlink,
    symlinkTarget,
    isWritable: true,
  };
}

/**
 * LISTAGEM REAL DE DIRETÓRIO (readdir + stat direto no disco)
 */
export async function listRealDirectory(
  clientRoot: string,
  relativePath: string = "",
  showHidden: boolean = true
): Promise<IFileListResult> {
  const targetDir = await validateSafePath(clientRoot, relativePath);
  const entries = await fs.readdir(targetDir, { withFileTypes: true });

  const items: IFileInfo[] = [];
  let totalSizeBytes = 0;
  let totalFiles = 0;
  let totalDirectories = 0;

  for (const entry of entries) {
    if (!showHidden && entry.name.startsWith(".")) continue;
    const fullPath = path.join(targetDir, entry.name);
    try {
      const info = await buildFileInfo(clientRoot, fullPath);
      items.push(info);
      if (info.type === "directory") {
        totalDirectories++;
      } else {
        totalFiles++;
        totalSizeBytes += info.size;
      }
    } catch (err) {
      console.warn(`[FileManager] Erro ao obter stat de ${fullPath}:`, err);
    }
  }

  // Ordenação padrão: Pastas primeiro, depois arquivos em ordem alfabética
  items.sort((a, b) => {
    if (a.type === "directory" && b.type !== "directory") return -1;
    if (a.type !== "directory" && b.type === "directory") return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
  });

  const cleanRel = path.relative(clientRoot, targetDir).replace(/\\/g, "/");
  const parentPath = cleanRel ? path.dirname(cleanRel).replace(/\\/g, "/").replace(/^\.$/, "") : null;

  return {
    currentPath: cleanRel,
    parentPath: parentPath === cleanRel ? null : parentPath,
    items,
    totalItems: items.length,
    totalFiles,
    totalDirectories,
    totalSizeBytes,
    isWritable: true,
    documentRoot: "/var/www/html",
  };
}

/**
 * LEITURA REAL DE ARQUIVO (com cálculo de SHA-256 e detecção de charset)
 */
export async function readRealFileContent(
  clientRoot: string,
  relativePath: string
): Promise<IFileReadResult> {
  const fullPath = await validateSafePath(clientRoot, relativePath);
  const stats = await fs.stat(fullPath);

  if (stats.isDirectory()) {
    throw new Error("O caminho especificado é um diretório, não um arquivo.");
  }

  const rawBuffer = await fs.readFile(fullPath);
  const sha256 = crypto.createHash("sha256").update(rawBuffer).digest("hex");
  const mimeType = getMimeType(fullPath);

  // Se for arquivo de texto ou código
  const isBinary = /^(image|audio|video|application\/(zip|x-tar|gzip|pdf|octet-stream))/.test(mimeType);
  const content = isBinary ? rawBuffer.toString("base64") : rawBuffer.toString("utf-8");
  const encoding = isBinary ? "base64" : "utf-8";

  return {
    path: path.relative(clientRoot, fullPath).replace(/\\/g, "/"),
    name: path.basename(fullPath),
    content,
    encoding,
    size: stats.size,
    sizeFormatted: formatBytes(stats.size),
    mtime: stats.mtime.toISOString(),
    sha256,
    isWritable: true,
    mimeType,
  };
}

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
  const tempPath = `${fullPath}.colify_tmp_${Date.now()}`;
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
  } catch (err: any) {
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
      } catch (err: any) {
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
 * EXTRAÇÃO REAL DE PACOTE ZIP NO FILESYSTEM
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

    const safeDestPath = path.join(targetDir, entryName);
    // Verificação de zip slip (path traversal dentro do zip)
    if (!safeDestPath.startsWith(targetDir)) {
      console.warn(`[Zip Slip Attack Bloqueado]: ${entryName}`);
      continue;
    }

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

/**
 * BUSCA REAL NO FILESYSTEM COM LIMITE SEGURO
 */
export async function searchRealFiles(
  clientRoot: string,
  query: string,
  startDirRelative: string = "",
  maxResults: number = 100
): Promise<IFileInfo[]> {
  const startDir = await validateSafePath(clientRoot, startDirRelative);
  const results: IFileInfo[] = [];
  const cleanQuery = query.toLowerCase().trim();

  async function walk(dir: string) {
    if (results.length >= maxResults) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= maxResults) break;
      const fullPath = path.join(dir, entry.name);

      if (entry.name.toLowerCase().includes(cleanQuery)) {
        try {
          const info = await buildFileInfo(clientRoot, fullPath);
          results.push(info);
        } catch (e) {}
      }

      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        await walk(fullPath);
      }
    }
  }

  await walk(startDir);
  return results;
}

/**
 * REGISTRO DE AUDITORIA NO BANCO DE DADOS
 */
export async function auditLogOperation(
  userId: string,
  appId: string,
  action: string,
  details: any
): Promise<void> {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      action: `file_manager.${action.toLowerCase()}`,
      resource_type: "application",
      resource_id: appId,
      metadata: {
        ...details,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn("[Audit Log Warning]:", err);
  }
}
