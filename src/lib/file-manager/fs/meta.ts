import path from "path";
import fs from "fs/promises";
import type { IFileInfo, FileType } from "../types.ts";

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
export async function buildFileInfo(clientRoot: string, fullPath: string): Promise<IFileInfo> {
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
    } catch {
      // Ignorar erro ao resolver symlink quebrado
    }
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
