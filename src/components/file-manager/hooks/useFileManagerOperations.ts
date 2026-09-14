import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  readFileContentFn,
  saveFileContentFn,
  createFileFn,
  createFolderFn,
  deleteItemsFn,
  renameItemFn,
  copyItemsFn,
  moveItemsFn,
  chmodItemFn,
  forcePullFilesFromSwarmFn,
} from "@/lib/file-manager/functions";
import type { IFileInfo, IFileReadResult } from "@/lib/file-manager/types";

interface UseFileManagerOperationsParams {
  appId: string;
  currentPath: string;
  refetch: () => void;
  setIsNewFileModalOpen: (open: boolean) => void;
  setNewFileName: (name: string) => void;
  setIsNewFolderModalOpen: (open: boolean) => void;
  setNewFolderName: (name: string) => void;
  setIsRenameModalOpen: (open: boolean) => void;
  setRenameTarget: (target: IFileInfo | null) => void;
  setRenameNewName: (name: string) => void;
  setIsMoveCopyModalOpen: (open: boolean) => void;
  setSelectedPaths: (paths: string[]) => void;
  setIsChmodOpen: (open: boolean) => void;
  setActiveChmodFile: (file: IFileInfo | null) => void;
  setIsEditorOpen: (open: boolean) => void;
  setActiveEditorFile: (file: IFileReadResult | null) => void;
  handleOpenExtract: (path: string) => void;
}

export function useFileManagerOperations({
  appId,
  currentPath,
  refetch,
  setIsNewFileModalOpen,
  setNewFileName,
  setIsNewFolderModalOpen,
  setNewFolderName,
  setIsRenameModalOpen,
  setRenameTarget,
  setRenameNewName,
  setIsMoveCopyModalOpen,
  setSelectedPaths,
  setIsChmodOpen,
  setActiveChmodFile,
  setIsEditorOpen,
  setActiveEditorFile,
  handleOpenExtract,
}: UseFileManagerOperationsParams) {
  const queryClient = useQueryClient();

  const createFileMutation = useMutation({
    mutationFn: (name: string) => {
      const full = currentPath ? `${currentPath}/${name}` : name;
      return createFileFn({ data: { appId, filePath: full, content: "" } });
    },
    onSuccess: (info) => {
      toast.success(`✓ Arquivo ${info.name} criado no filesystem!`);
      setIsNewFileModalOpen(false);
      setNewFileName("");
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      refetch();
    },
    onError: (err: any) => toast.error("Erro ao criar arquivo: " + err.message),
  });

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => {
      const full = currentPath ? `${currentPath}/${name}` : name;
      return createFolderFn({ data: { appId, folderPath: full } });
    },
    onSuccess: (info) => {
      toast.success(`✓ Diretório ${info.name} criado no filesystem!`);
      setIsNewFolderModalOpen(false);
      setNewFolderName("");
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      refetch();
    },
    onError: (err: any) => toast.error("Erro ao criar pasta: " + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (paths: string[]) => deleteItemsFn({ data: { appId, paths } }),
    onSuccess: (res) => {
      toast.success(`✓ ${res.deleted.length} item(ns) removido(s) do filesystem.`);
      setSelectedPaths([]);
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      refetch();
    },
    onError: (err: any) => toast.error("Erro ao excluir itens: " + err.message),
  });

  const renameMutation = useMutation({
    mutationFn: ({ oldPath, newName }: { oldPath: string; newName: string }) =>
      renameItemFn({ data: { appId, oldPath, newName } }),
    onSuccess: (info) => {
      toast.success(`✓ Renomeado para ${info.name}!`);
      setIsRenameModalOpen(false);
      setRenameTarget(null);
      setRenameNewName("");
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      refetch();
    },
    onError: (err: any) => toast.error("Erro ao renomear: " + err.message),
  });

  const moveMutation = useMutation({
    mutationFn: ({ paths, targetDir }: { paths: string[]; targetDir: string }) =>
      moveItemsFn({ data: { appId, paths, targetDir } }),
    onSuccess: (res) => {
      toast.success(`✓ ${res.length} item(ns) movido(s) com sucesso!`);
      setIsMoveCopyModalOpen(false);
      setSelectedPaths([]);
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      refetch();
    },
    onError: (err: any) => toast.error("Erro ao mover: " + err.message),
  });

  const copyMutation = useMutation({
    mutationFn: ({ paths, targetDir }: { paths: string[]; targetDir: string }) =>
      copyItemsFn({ data: { appId, paths, targetDir } }),
    onSuccess: (res) => {
      toast.success(`✓ ${res.length} item(ns) copiado(s) com sucesso!`);
      setIsMoveCopyModalOpen(false);
      setSelectedPaths([]);
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      refetch();
    },
    onError: (err: any) => toast.error("Erro ao copiar: " + err.message),
  });

  const chmodMutation = useMutation({
    mutationFn: ({ path, modeOctal }: { path: string; modeOctal: string }) =>
      chmodItemFn({ data: { appId, filePath: path, modeOctal } }),
    onSuccess: (res) => {
      toast.success(`✓ Permissões de ${res.path} alteradas para ${res.permissions} (${res.rwx})`);
      setIsChmodOpen(false);
      setActiveChmodFile(null);
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      refetch();
    },
    onError: (err: any) => toast.error("Erro ao alterar chmod: " + err.message),
  });

  // Abrir arquivo para edição (com bloqueio de binários e desvio automático de ZIPs)
  const handleOpenFileForEdit = useCallback(
    async (filePath: string) => {
      const ext = filePath.split(".").pop()?.toLowerCase() || "";
      if (["zip", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz"].includes(ext)) {
        handleOpenExtract(filePath);
        return;
      }

      if (
        [
          "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "tiff",
          "mp4", "webm", "mp3", "wav", "ogg", "flac", "aac",
          "pdf", "exe", "bin", "iso", "dmg", "apk", "jar", "wasm", "db", "sqlite",
        ].includes(ext)
      ) {
        toast.info(`O arquivo '${filePath.split("/").pop()}' é binário e não pode ser editado como código.`);
        return;
      }

      try {
        const fileData = await readFileContentFn({ data: { appId, filePath } });
        if (fileData.encoding === "base64") {
          toast.info(`O arquivo '${fileData.name}' é um arquivo binário. Faça o download para visualizá-lo.`);
          return;
        }
        setActiveEditorFile(fileData);
        setIsEditorOpen(true);
      } catch (err: any) {
        toast.error("Erro ao abrir arquivo: " + err.message);
      }
    },
    [appId, handleOpenExtract, setActiveEditorFile, setIsEditorOpen]
  );

  // Download de item individual
  const handleDownloadFile = useCallback(
    async (item: IFileInfo) => {
      try {
        const fileData = await readFileContentFn({ data: { appId, filePath: item.path } });
        const byteChars =
          fileData.encoding === "base64"
            ? atob(fileData.content)
            : unescape(encodeURIComponent(fileData.content));
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: fileData.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = item.name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Download de ${item.name} iniciado!`);
      } catch (err: any) {
        toast.error("Erro ao baixar arquivo: " + err.message);
      }
    },
    [appId]
  );

  const handleRefreshFiles = useCallback(async () => {
    try {
      toast.loading("Sincronizando com o container...", { id: "sync-refresh" });
      await forcePullFilesFromSwarmFn({ data: { appId } }).catch(() => {});
      await refetch();
      toast.success("Arquivos sincronizados com o container!", { id: "sync-refresh" });
    } catch {
      refetch();
    }
  }, [appId, refetch]);

  const handleSaveEditorContent = useCallback(
    async (filePath: string, content: string, expectedSha256?: string, force?: boolean) => {
      const res = await saveFileContentFn({
        data: { appId, filePath, content, expectedSha256, force: Boolean(force) },
      });
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      refetch();
      return { sha256: res.sha256, mtime: res.mtime };
    },
    [appId, queryClient, refetch]
  );

  const handleReloadEditorFile = useCallback(
    async (filePath: string) => {
      const refreshed = await readFileContentFn({ data: { appId, filePath } });
      setActiveEditorFile(refreshed);
      return refreshed;
    },
    [appId, setActiveEditorFile]
  );

  return {
    createFileMutation,
    createFolderMutation,
    deleteMutation,
    renameMutation,
    moveMutation,
    copyMutation,
    chmodMutation,
    handleOpenFileForEdit,
    handleDownloadFile,
    handleRefreshFiles,
    handleSaveEditorContent,
    handleReloadEditorFile,
  };
}
