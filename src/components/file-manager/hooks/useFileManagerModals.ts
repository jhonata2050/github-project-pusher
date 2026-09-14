import { useState, useCallback } from "react";
import type { IFileInfo, IFileReadResult } from "@/lib/file-manager/types";
import type { DeleteConfirmState } from "./types";

export function useFileManagerModals() {
  // Editor
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeEditorFile, setActiveEditorFile] = useState<IFileReadResult | null>(null);

  // Chmod
  const [isChmodOpen, setIsChmodOpen] = useState(false);
  const [activeChmodFile, setActiveChmodFile] = useState<IFileInfo | null>(null);

  // Propriedades
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [activePropertiesFile, setActivePropertiesFile] = useState<IFileInfo | null>(null);

  // Novo Arquivo
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  // Nova Pasta
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Renomear
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<IFileInfo | null>(null);
  const [renameNewName, setRenameNewName] = useState("");

  // Mover / Copiar
  const [isMoveCopyModalOpen, setIsMoveCopyModalOpen] = useState(false);
  const [moveCopyAction, setMoveCopyAction] = useState<"move" | "copy">("move");
  const [targetDirectoryInput, setTargetDirectoryInput] = useState("");

  // Compactar
  const [isCompressModalOpen, setIsCompressModalOpen] = useState(false);
  const [compressArchiveName, setCompressArchiveName] = useState("");

  // Confirmação de exclusão
  const [deleteConfirmState, setDeleteConfirmState] = useState<DeleteConfirmState>({
    isOpen: false,
    paths: [],
    displayName: "",
  });

  // Handlers utilitários de abertura
  const handleOpenChmod = useCallback((item: IFileInfo) => {
    setActiveChmodFile(item);
    setIsChmodOpen(true);
  }, []);

  const handleOpenRename = useCallback((item: IFileInfo) => {
    setRenameTarget(item);
    setRenameNewName(item.name);
    setIsRenameModalOpen(true);
  }, []);

  const handleOpenProperties = useCallback((item: IFileInfo) => {
    setActivePropertiesFile(item);
    setIsPropertiesOpen(true);
  }, []);

  const handleDeleteSingle = useCallback((item: IFileInfo) => {
    setDeleteConfirmState({
      isOpen: true,
      paths: [item.path],
      displayName: item.name,
    });
  }, []);

  return {
    isEditorOpen,
    setIsEditorOpen,
    activeEditorFile,
    setActiveEditorFile,
    isChmodOpen,
    setIsChmodOpen,
    activeChmodFile,
    setActiveChmodFile,
    handleOpenChmod,
    isPropertiesOpen,
    setIsPropertiesOpen,
    activePropertiesFile,
    setActivePropertiesFile,
    handleOpenProperties,
    isNewFileModalOpen,
    setIsNewFileModalOpen,
    newFileName,
    setNewFileName,
    isNewFolderModalOpen,
    setIsNewFolderModalOpen,
    newFolderName,
    setNewFolderName,
    isRenameModalOpen,
    setIsRenameModalOpen,
    renameTarget,
    setRenameTarget,
    renameNewName,
    setRenameNewName,
    handleOpenRename,
    isMoveCopyModalOpen,
    setIsMoveCopyModalOpen,
    moveCopyAction,
    setMoveCopyAction,
    targetDirectoryInput,
    setTargetDirectoryInput,
    isCompressModalOpen,
    setIsCompressModalOpen,
    compressArchiveName,
    setCompressArchiveName,
    deleteConfirmState,
    setDeleteConfirmState,
    handleDeleteSingle,
  };
}
