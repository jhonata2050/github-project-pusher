import type { IFileInfo } from "@/lib/file-manager/types";

export interface FileManagerDialogsProps {
  docRoot: string;
  currentPath: string;

  // Novo Arquivo
  isNewFileModalOpen: boolean;
  setIsNewFileModalOpen: (open: boolean) => void;
  newFileName: string;
  setNewFileName: (name: string) => void;
  onCreateFile: (name: string) => void;
  createFilePending: boolean;

  // Nova Pasta
  isNewFolderModalOpen: boolean;
  setIsNewFolderModalOpen: (open: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  onCreateFolder: (name: string) => void;
  createFolderPending: boolean;

  // Renomear
  isRenameModalOpen: boolean;
  setIsRenameModalOpen: (open: boolean) => void;
  renameTarget: IFileInfo | null;
  renameNewName: string;
  setRenameNewName: (name: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  renamePending: boolean;

  // Mover / Copiar
  isMoveCopyModalOpen: boolean;
  setIsMoveCopyModalOpen: (open: boolean) => void;
  moveCopyAction: "move" | "copy";
  selectedPathsCount: number;
  targetDirectoryInput: string;
  setTargetDirectoryInput: (dir: string) => void;
  onMoveCopy: () => void;
  moveCopyPending: boolean;

  // Compactar
  isCompressModalOpen: boolean;
  setIsCompressModalOpen: (open: boolean) => void;
  compressArchiveName: string;
  setCompressArchiveName: (name: string) => void;
  onCompress: (archiveName: string) => void;
  compressRunning: boolean;

  // Conflito de Extração
  isExtractConflictModalOpen: boolean;
  setIsExtractConflictModalOpen: (open: boolean) => void;
  pendingExtractPath: string | null;
  onStartExtractJob: (archivePath: string, policy: "overwrite" | "skip" | "abort") => void;
  onCancelExtract: () => void;

  // Job Assíncrono (Progresso)
  isJobModalOpen: boolean;
  activeJob: {
    id: string;
    type: string;
    status: string;
    progress: number;
    totalFiles: number;
    processedFiles: number;
    currentFile: string;
    error?: string | undefined;
  } | null;
  onCancelActiveJob: () => void;

  // Exclusão
  deleteConfirmState: {
    isOpen: boolean;
    paths: string[];
    displayName: string;
  };
  setDeleteConfirmState: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      paths: string[];
      displayName: string;
    }>
  >;
  onConfirmDelete: (paths: string[]) => void;
}
