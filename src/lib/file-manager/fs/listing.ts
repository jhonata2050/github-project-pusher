import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { validateSafePath } from "../security.ts";
import { buildFileInfo, formatBytes, getMimeType } from "./meta.ts";
import type {
  IFileInfo,
  IFileListResult,
  IFileReadResult,
} from "../types.ts";

/**
 * LISTAGEM REAL DE DIRETÓRIO (readdir + stat direto no disco)
 */
export async function listRealDirectory(
  clientRoot: string,
  relativePath: string = "",
  showHidden: boolean = true,
  documentRoot: string = "/var/www/html"
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
    documentRoot,
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

  const ext = path.extname(fullPath).toLowerCase().replace(/^\./, "");
  const isArchive = ["zip", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz"].includes(ext);
  if (isArchive) {
    throw new Error(
      `O arquivo '${path.basename(fullPath)}' é um pacote compactado (${ext.toUpperCase()}). Utilize a opção 'Descompactar / Extrair' no gerenciador de arquivos.`
    );
  }

  if (stats.size > 5 * 1024 * 1024) {
    throw new Error(
      `O arquivo '${path.basename(fullPath)}' possui ${(stats.size / (1024 * 1024)).toFixed(1)} MB e excede o limite de 5 MB para edição no navegador. Faça o download para editar localmente.`
    );
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
        } catch {
          // Ignorar erros em itens não acessíveis
        }
      }

      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        await walk(fullPath);
      }
    }
  }

  await walk(startDir);
  return results;
}
