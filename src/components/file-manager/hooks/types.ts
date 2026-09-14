import type { IFileInfo, IFileReadResult } from "@/lib/file-manager/types";

export interface UseFileManagerOptions {
  appId: string;
  containerRoot?: string | undefined;
}

export type FileSortBy = "name" | "size" | "mtime" | "type" | "permissions";
export type FileSortOrder = "asc" | "desc";
export type FileViewMode = "list" | "grid";

export interface BreadcrumbSegment {
  name: string;
  path: string;
}

export interface ActiveJobState {
  id: string;
  type: string;
  status: string;
  progress: number;
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  error?: string;
  resultSummary?: any;
}

export interface DeleteConfirmState {
  isOpen: boolean;
  paths: string[];
  displayName: string;
}
