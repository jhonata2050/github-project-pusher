import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFileManagerFiles } from "@/lib/file-manager/functions";
import type { UseFileManagerOptions } from "./types";
import { useFileManagerNavigation } from "./useFileManagerNavigation";
import { useFileManagerSelection } from "./useFileManagerSelection";
import { useFileManagerModals } from "./useFileManagerModals";
import { useFileManagerJobs } from "./useFileManagerJobs";
import { useFileManagerOperations } from "./useFileManagerOperations";
import { useFileManagerUpload } from "./useFileManagerUpload";

export type { UseFileManagerOptions };

export function useFileManager({ appId, containerRoot }: UseFileManagerOptions) {
  // 1. Navegação e histórico
  const nav = useFileManagerNavigation("");

  // 2. Consulta real de arquivos do filesystem
  const {
    data: fileListData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["realFileManagerFiles", appId, nav.currentPath, nav.showHidden],
    queryFn: () => getFileManagerFiles({ data: { appId, path: nav.currentPath, showHidden: nav.showHidden } }),
    refetchOnWindowFocus: true,
  });

  const docRoot = (fileListData?.documentRoot || containerRoot || "/var/www/html").replace(/\/+$/, "");

  // 3. Filtragem, ordenação e seleção de arquivos
  const selection = useFileManagerSelection(fileListData?.items || []);

  // Limpa seleções ao navegar para outro diretório
  useEffect(() => {
    selection.setSelectedPaths([]);
  }, [nav.currentPath]);

  // 4. Modais e diálogos
  const modals = useFileManagerModals();

  // 5. Jobs assíncronos (descompactação e compressão)
  const jobs = useFileManagerJobs({
    appId,
    currentPath: nav.currentPath,
    refetch,
    onClearSelection: () => selection.setSelectedPaths([]),
    onCloseCompressModal: () => modals.setIsCompressModalOpen(false),
  });

  // 6. Operações CRUD e editor
  const operations = useFileManagerOperations({
    appId,
    currentPath: nav.currentPath,
    refetch,
    setIsNewFileModalOpen: modals.setIsNewFileModalOpen,
    setNewFileName: modals.setNewFileName,
    setIsNewFolderModalOpen: modals.setIsNewFolderModalOpen,
    setNewFolderName: modals.setNewFolderName,
    setIsRenameModalOpen: modals.setIsRenameModalOpen,
    setRenameTarget: modals.setRenameTarget,
    setRenameNewName: modals.setRenameNewName,
    setIsMoveCopyModalOpen: modals.setIsMoveCopyModalOpen,
    setSelectedPaths: selection.setSelectedPaths,
    setIsChmodOpen: modals.setIsChmodOpen,
    setActiveChmodFile: modals.setActiveChmodFile,
    setIsEditorOpen: modals.setIsEditorOpen,
    setActiveEditorFile: modals.setActiveEditorFile,
    handleOpenExtract: jobs.handleOpenExtract,
  });

  // 7. Upload de arquivos com progresso
  const upload = useFileManagerUpload({
    appId,
    currentPath: nav.currentPath,
    refetch,
  });

  return {
    // Navegação
    currentPath: nav.currentPath,
    setCurrentPath: nav.setCurrentPath,
    history: nav.history,
    historyIndex: nav.historyIndex,
    showHidden: nav.showHidden,
    setShowHidden: nav.setShowHidden,
    viewMode: nav.viewMode,
    setViewMode: nav.setViewMode,
    navigateTo: nav.navigateTo,
    navigateBack: nav.navigateBack,
    navigateForward: nav.navigateForward,
    navigateUp: nav.navigateUp,
    breadcrumbSegments: nav.breadcrumbSegments,

    // Seleção e Ordenação
    searchQuery: selection.searchQuery,
    setSearchQuery: selection.setSearchQuery,
    sortBy: selection.sortBy,
    setSortBy: selection.setSortBy,
    sortOrder: selection.sortOrder,
    setSortOrder: selection.setSortOrder,
    selectedPaths: selection.selectedPaths,
    setSelectedPaths: selection.setSelectedPaths,
    filteredAndSortedItems: selection.filteredAndSortedItems,
    toggleSelect: selection.toggleSelect,
    selectedPathsSet: selection.selectedPathsSet,
    isAllSelected: selection.isAllSelected,
    isSomeSelected: selection.isSomeSelected,
    handleToggleSelectAll: selection.handleToggleSelectAll,

    // Modais
    isEditorOpen: modals.isEditorOpen,
    setIsEditorOpen: modals.setIsEditorOpen,
    activeEditorFile: modals.activeEditorFile,
    setActiveEditorFile: modals.setActiveEditorFile,
    isChmodOpen: modals.isChmodOpen,
    setIsChmodOpen: modals.setIsChmodOpen,
    activeChmodFile: modals.activeChmodFile,
    setActiveChmodFile: modals.setActiveChmodFile,
    handleOpenChmod: modals.handleOpenChmod,
    isPropertiesOpen: modals.isPropertiesOpen,
    setIsPropertiesOpen: modals.setIsPropertiesOpen,
    activePropertiesFile: modals.activePropertiesFile,
    setActivePropertiesFile: modals.setActivePropertiesFile,
    handleOpenProperties: modals.handleOpenProperties,
    isNewFileModalOpen: modals.isNewFileModalOpen,
    setIsNewFileModalOpen: modals.setIsNewFileModalOpen,
    newFileName: modals.newFileName,
    setNewFileName: modals.setNewFileName,
    isNewFolderModalOpen: modals.isNewFolderModalOpen,
    setIsNewFolderModalOpen: modals.setIsNewFolderModalOpen,
    newFolderName: modals.newFolderName,
    setNewFolderName: modals.setNewFolderName,
    isRenameModalOpen: modals.isRenameModalOpen,
    setIsRenameModalOpen: modals.setIsRenameModalOpen,
    renameTarget: modals.renameTarget,
    setRenameTarget: modals.setRenameTarget,
    renameNewName: modals.renameNewName,
    setRenameNewName: modals.setRenameNewName,
    handleOpenRename: modals.handleOpenRename,
    isMoveCopyModalOpen: modals.isMoveCopyModalOpen,
    setIsMoveCopyModalOpen: modals.setIsMoveCopyModalOpen,
    moveCopyAction: modals.moveCopyAction,
    setMoveCopyAction: modals.setMoveCopyAction,
    targetDirectoryInput: modals.targetDirectoryInput,
    setTargetDirectoryInput: modals.setTargetDirectoryInput,
    isCompressModalOpen: modals.isCompressModalOpen,
    setIsCompressModalOpen: modals.setIsCompressModalOpen,
    compressArchiveName: modals.compressArchiveName,
    setCompressArchiveName: modals.setCompressArchiveName,
    deleteConfirmState: modals.deleteConfirmState,
    setDeleteConfirmState: modals.setDeleteConfirmState,
    handleDeleteSingle: modals.handleDeleteSingle,

    // Jobs
    activeJob: jobs.activeJob,
    isJobModalOpen: jobs.isJobModalOpen,
    setIsJobModalOpen: jobs.setIsJobModalOpen,
    isExtractConflictModalOpen: jobs.isExtractConflictModalOpen,
    setIsExtractConflictModalOpen: jobs.setIsExtractConflictModalOpen,
    pendingExtractPath: jobs.pendingExtractPath,
    setPendingExtractPath: jobs.setPendingExtractPath,
    handleStartExtractJob: jobs.handleStartExtractJob,
    handleStartCompressJob: jobs.handleStartCompressJob,
    handleCancelActiveJob: jobs.handleCancelActiveJob,
    handleOpenExtract: jobs.handleOpenExtract,

    // Operações CRUD & Editor
    createFileMutation: operations.createFileMutation,
    createFolderMutation: operations.createFolderMutation,
    deleteMutation: operations.deleteMutation,
    renameMutation: operations.renameMutation,
    moveMutation: operations.moveMutation,
    copyMutation: operations.copyMutation,
    chmodMutation: operations.chmodMutation,
    handleOpenFileForEdit: operations.handleOpenFileForEdit,
    handleDownloadFile: operations.handleDownloadFile,
    handleRefreshFiles: operations.handleRefreshFiles,
    handleSaveEditorContent: operations.handleSaveEditorContent,
    handleReloadEditorFile: operations.handleReloadEditorFile,

    // Upload
    fileInputRef: upload.fileInputRef,
    isUploading: upload.isUploading,
    uploadProgress: upload.uploadProgress,
    uploadStatusText: upload.uploadStatusText,
    handleUploadFiles: upload.handleUploadFiles,

    // Query & Estado de carregamento
    fileListData,
    isLoading,
    isFetching,
    refetch,
    docRoot,
  };
}
