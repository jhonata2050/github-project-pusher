export type FileType = "file" | "directory" | "symlink";

export interface IFileInfo {
  name: string;
  path: string; // Caminho relativo ao root do cliente (ex: "assets/css/style.css" ou "index.html")
  type: FileType;
  size: number;
  sizeFormatted: string;
  mtime: string; // ISO string da última modificação real no filesystem
  birthtime?: string;
  permissions: string; // Octal (ex: "0755", "0644")
  rwx: string; // String rwx (ex: "-rwxr-xr-x", "drwxr-xr-x")
  owner?: string;
  group?: string;
  mimeType: string;
  isHidden: boolean;
  isSymlink: boolean;
  symlinkTarget?: string;
  sha256?: string;
  isWritable?: boolean;
}

export interface IFileListResult {
  currentPath: string; // Caminho relativo atual (ex: "" para raiz, ou "assets/css")
  parentPath: string | null;
  items: IFileInfo[];
  totalItems: number;
  totalFiles: number;
  totalDirectories: number;
  totalSizeBytes: number;
  isWritable: boolean;
  documentRoot: string; // Caminho canônico mascarado para exibição (ex: "/var/www/html" ou "/home/cliente/public_html")
}

export interface IFileReadResult {
  path: string;
  name: string;
  content: string;
  encoding: "utf-8" | "base64";
  size: number;
  sizeFormatted: string;
  mtime: string;
  sha256: string;
  isWritable: boolean;
  mimeType: string;
}

export interface IFileWriteResult {
  success: boolean;
  path: string;
  size: number;
  sizeFormatted: string;
  mtime: string;
  sha256: string;
}

export interface IChmodResult {
  path: string;
  permissions: string;
  rwx: string;
}

export interface ICompressOptions {
  paths: string[];
  archiveName: string;
  format?: "zip" | "tar" | "tar.gz";
  destinationDir?: string;
}

export interface IConflictInfo {
  hasConflict: boolean;
  serverMtime: string;
  serverSha256: string;
  serverSize: number;
}
