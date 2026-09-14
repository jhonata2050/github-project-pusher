import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getFileManagerFiles,
  readFileContentFn,
  saveFileContentFn,
  createFileFn,
  createFolderFn,
  deleteItemsFn,
  renameItemFn,
  copyItemsFn,
  moveItemsFn,
  chmodItemFn,
  extractArchiveFn,
  startExtractJobFn,
  getJobStatusFn,
  cancelJobFn,
  forcePullFilesFromSwarmFn,
} from "@/lib/file-manager/functions";
import type { IFileInfo, IFileReadResult } from "@/lib/file-manager/types";

export interface UseFileManagerOptions {
  appId: string;
  containerRoot?: string | undefined;
}

export function useFileManager({ appId, containerRoot }: UseFileManagerOptions) {
  const queryClient = useQueryClient();

  const [currentPath, setCurrentPath] = useState<string>("");
  const [history, setHistory] = useState<string[]>([""]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [showHidden, setShowHidden] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Estados de ordenação
  const [sortBy, setSortBy] = useState<"name" | "size" | "mtime" | "type" | "permissions">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Estados de seleção
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  // Estados dos Modais
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeEditorFile, setActiveEditorFile] = useState<IFileReadResult | null>(null);

  const [isChmodOpen, setIsChmodOpen] = useState(false);
  const [activeChmodFile, setActiveChmodFile] = useState<IFileInfo | null>(null);

  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [activePropertiesFile, setActivePropertiesFile] = useState<IFileInfo | null>(null);

  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<IFileInfo | null>(null);
  const [renameNewName, setRenameNewName] = useState("");

  const [isMoveCopyModalOpen, setIsMoveCopyModalOpen] = useState(false);
  const [moveCopyAction, setMoveCopyAction] = useState<"move" | "copy">("move");
  const [targetDirectoryInput, setTargetDirectoryInput] = useState("");

  const [isCompressModalOpen, setIsCompressModalOpen] = useState(false);
  const [compressArchiveName, setCompressArchiveName] = useState("");

  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    paths: string[];
    displayName: string;
  }>({ isOpen: false, paths: [], displayName: "" });

  // Estados de Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");

  // Consulta real de arquivos do filesystem
  const {
    data: fileListData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["realFileManagerFiles", appId, currentPath, showHidden],
    queryFn: () => getFileManagerFiles({ data: { appId, path: currentPath, showHidden } }),
    refetchOnWindowFocus: true,
  });

  const docRoot = (fileListData?.documentRoot || containerRoot || "/var/www/html").replace(/\/+$/, "");

  // Limpa seleções ao navegar para outro diretório
  useEffect(() => {
    setSelectedPaths([]);
  }, [currentPath]);

  // Função de navegação com histórico
  const navigateTo = useCallback((newPath: string) => {
    const clean = newPath.replace(/^[\/\\]+|[\/\\]+$/g, "");
    if (clean === currentPath) return;
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(clean);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
    setCurrentPath(clean);
  }, [currentPath, history, historyIndex]);

  const navigateBack = useCallback(() => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setCurrentPath(history[prevIdx] || "");
    }
  }, [history, historyIndex]);

  const navigateForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setCurrentPath(history[nextIdx] || "");
    }
  }, [history, historyIndex]);

  const navigateUp = useCallback(() => {
    if (!currentPath) return;
    const parts = currentPath.split("/");
    parts.pop();
    navigateTo(parts.join("/"));
  }, [currentPath, navigateTo]);

  // Breadcrumbs interativos
  const breadcrumbSegments = useMemo(() => {
    if (!currentPath) return [];
    const parts = currentPath.split("/");
    return parts.map((part, idx) => ({
      name: part,
      path: parts.slice(0, idx + 1).join("/"),
    }));
  }, [currentPath]);

  // Itens filtrados e ordenados
  const filteredAndSortedItems = useMemo(() => {
    const items = [...(fileListData?.items || [])];

    const filtered = items.filter((item) => {
      if (!searchQuery) return true;
      return (
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.path.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    filtered.sort((a, b) => {
      // Pastas sempre no topo
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;

      let comp = 0;
      if (sortBy === "name") {
        comp = a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
      } else if (sortBy === "size") {
        comp = a.size - b.size;
      } else if (sortBy === "mtime") {
        comp = new Date(a.mtime).getTime() - new Date(b.mtime).getTime();
      } else if (sortBy === "permissions") {
        comp = a.permissions.localeCompare(b.permissions);
      } else if (sortBy === "type") {
        comp = a.mimeType.localeCompare(b.mimeType);
      }
      return sortOrder === "asc" ? comp : -comp;
    });

    return filtered;
  }, [fileListData, searchQuery, sortBy, sortOrder]);

  // Alterna seleção de arquivo
  const toggleSelect = useCallback((path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  }, []);

  // Set otimizado de caminhos selecionados para verificação O(1)
  const selectedPathsSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

  // Selecionar Todos
  const isAllSelected =
    filteredAndSortedItems.length > 0 &&
    filteredAndSortedItems.every((item) => selectedPathsSet.has(item.path));
  const isSomeSelected =
    filteredAndSortedItems.some((item) => selectedPathsSet.has(item.path)) && !isAllSelected;

  const handleToggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedPaths([]);
    } else {
      setSelectedPaths(filteredAndSortedItems.map((item) => item.path));
    }
  }, [isAllSelected, filteredAndSortedItems]);

  // Mutações do TanStack Query
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

  // Estados de Jobs Assíncronos (Descompactação / Compressão com Progresso Real)
  const [activeJob, setActiveJob] = useState<{
    id: string;
    type: string;
    status: string;
    progress: number;
    totalFiles: number;
    processedFiles: number;
    currentFile: string;
    error?: string;
    resultSummary?: any;
  } | null>(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isExtractConflictModalOpen, setIsExtractConflictModalOpen] = useState(false);
  const [pendingExtractPath, setPendingExtractPath] = useState<string | null>(null);

  // Monitoramento do Job em tempo real com polling de alta precisão
  useEffect(() => {
    if (!activeJob || activeJob.status === "completed" || activeJob.status === "failed" || activeJob.status === "cancelled") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        let jobData: any = null;
        try {
          const res = await getJobStatusFn({ data: { jobId: activeJob.id } });
          if (res?.success && res.job) {
            jobData = res.job;
          }
        } catch {
          const res = await fetch(`/api/file-manager/jobs/${activeJob.id}`, { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (data.job) jobData = data.job;
          }
        }

        if (jobData) {
          setActiveJob(jobData);
          if (
            jobData.status === "completed" ||
            (jobData.progress >= 100 && jobData.processedFiles >= jobData.totalFiles && jobData.totalFiles > 0)
          ) {
            toast.success(
              jobData.type === "extract"
                ? `✓ Descompactação concluída com sucesso (${jobData.resultSummary?.extractedCount || jobData.totalFiles} arquivos)!`
                : `✓ Compressão concluída com sucesso (${jobData.resultSummary?.totalPacked || jobData.totalFiles} arquivos)!`
            );
            queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
            refetch();
            setTimeout(() => {
              setIsJobModalOpen(false);
              setActiveJob(null);
            }, 800);
          } else if (jobData.status === "failed") {
            toast.error(`✕ Falha no processamento: ${jobData.error}`);
            setTimeout(() => {
              setIsJobModalOpen(false);
              setActiveJob(null);
            }, 2500);
          } else if (jobData.status === "cancelled") {
            toast.info("Operação cancelada pelo usuário.");
            setTimeout(() => {
              setIsJobModalOpen(false);
              setActiveJob(null);
            }, 1000);
          }
        }
      } catch (err) {
        console.warn("[Job Poll Error]:", err);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status, appId, queryClient, refetch]);

  // Iniciar Extração Assíncrona com Job e Fallback Imediato
  const handleStartExtractJob = useCallback(async (archivePath: string, conflictPolicy: "overwrite" | "skip" | "abort" = "overwrite") => {
    try {
      setIsExtractConflictModalOpen(false);
      setPendingExtractPath(null);

      // 1. Tentar via Server Function segura do TanStack Start
      try {
        const res: any = await startExtractJobFn({
          data: {
            appId,
            archivePath,
            targetDir: currentPath,
            conflictPolicy,
          },
        });

        if (res?.success && res.job) {
          setActiveJob(res.job);
          setIsJobModalOpen(true);
          return;
        }
      } catch (jobErr: any) {
        console.warn("[Job ServerFn Error, falling back]:", jobErr?.message);
      }

      // 2. Fallback via API Fetch com credentials: "include"
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        
        const res = await fetch("/api/file-manager/jobs/extract", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            appId,
            archivePath,
            targetDir: currentPath,
            conflictPolicy,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.job) {
          setActiveJob(data.job);
          setIsJobModalOpen(true);
          return;
        }
      } catch (fetchErr: any) {
        console.warn("[Fetch Job Error, trying direct extract]:", fetchErr?.message);
      }

      // 3. Fallback definitivo: extração direta via extractArchiveFn
      toast.loading("Descompactando arquivo e sincronizando com o cluster...", { id: "extract-sync" });
      const extractResult = await extractArchiveFn({
        data: {
          appId,
          archivePath,
          targetDir: currentPath,
        },
      });

      toast.success(`✓ Descompactação concluída (${extractResult.extractedCount} arquivos extraídos e sincronizados)!`, { id: "extract-sync" });
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      refetch();
    } catch (err: any) {
      toast.error("Erro na descompactação: " + err.message, { id: "extract-sync" });
    }
  }, [appId, currentPath, queryClient, refetch]);

  // Iniciar Compressão Assíncrona com Job
  const handleStartCompressJob = useCallback(async (paths: string[], archiveName: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch("/api/file-manager/jobs/compress", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          appId,
          paths,
          archiveName,
          targetDir: currentPath,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao iniciar compressão.");
      }

      setActiveJob(data.job);
      setIsJobModalOpen(true);
      setIsCompressModalOpen(false);
      setCompressArchiveName("");
      setSelectedPaths([]);
    } catch (err: any) {
      toast.error("Erro ao iniciar compressão: " + err.message);
    }
  }, [appId, currentPath]);

  // Cancelar Job Ativo
  const handleCancelActiveJob = useCallback(async () => {
    if (!activeJob) return;
    try {
      try {
        await cancelJobFn({ data: { jobId: activeJob.id } });
      } catch {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        await fetch(`/api/file-manager/jobs/${activeJob.id}`, {
          method: "POST",
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      }
      toast.info("Cancelamento solicitado...");
    } catch (err: any) {
      toast.error("Erro ao solicitar cancelamento: " + err.message);
    }
  }, [activeJob]);

  // Abrir modal de extração de arquivo compactado (ZIP, TAR, GZ, etc.)
  const handleOpenExtract = useCallback((path: string) => {
    setPendingExtractPath(path);
    setIsExtractConflictModalOpen(true);
  }, []);

  // Abrir arquivo para edição (com bloqueio contra arquivos binários e desvio automático de ZIPs)
  const handleOpenFileForEdit = useCallback(async (filePath: string) => {
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    if (["zip", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz"].includes(ext)) {
      handleOpenExtract(filePath);
      return;
    }

    if ([
      "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "tiff",
      "mp4", "webm", "mp3", "wav", "ogg", "flac", "aac",
      "pdf", "exe", "bin", "iso", "dmg", "apk", "jar", "wasm", "db", "sqlite",
    ].includes(ext)) {
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
  }, [appId, handleOpenExtract]);

  // Upload de arquivos com progresso real de 0% a 100% e suporte a grandes arquivos
  const handleUploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatusText("Iniciando upload...");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      let totalBytesAllFiles = 0;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f) totalBytesAllFiles += f.size;
      }

      const formatBytes = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const idx = Math.floor(Math.log(bytes) / Math.log(k));
        const unit = sizes[idx] || "B";
        return parseFloat((bytes / Math.pow(k, idx)).toFixed(1)) + " " + unit;
      };

      let uploadedBytesPriorFiles = 0;
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append("appId", appId);
          formData.append("targetDir", currentPath);
          formData.append("file", file);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const currentTotalSent = uploadedBytesPriorFiles + event.loaded;
              const percent = totalBytesAllFiles > 0
                ? Math.min(99, Math.round((currentTotalSent / totalBytesAllFiles) * 100))
                : 100;

              setUploadProgress(percent);
              const loadedFmt = formatBytes(currentTotalSent);
              const totalFmt = formatBytes(totalBytesAllFiles);
              setUploadStatusText(`Enviando (${i + 1}/${files.length}): ${file.name} — ${loadedFmt} / ${totalFmt} (${percent}%)`);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              uploadedBytesPriorFiles += file.size;
              successCount++;
              resolve();
            } else {
              try {
                const errData = JSON.parse(xhr.responseText);
                reject(new Error(errData.error || `Erro ${xhr.status} no upload de ${file.name}`));
              } catch {
                reject(new Error(`Erro HTTP ${xhr.status} no upload de ${file.name}`));
              }
            }
          };

          xhr.onerror = () => reject(new Error(`Falha de rede ao enviar ${file.name}`));
          xhr.ontimeout = () => reject(new Error(`Tempo limite excedido ao enviar ${file.name}`));

          xhr.open("POST", "/api/file-manager/upload");
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(formData);
        });
      }

      setUploadProgress(100);
      setUploadStatusText("Concluído!");
      toast.success(`✓ ${successCount} arquivo(s) gravado(s) com sucesso no servidor!`);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      refetch();

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatusText("");
      }, 1200);
    } catch (err: any) {
      toast.error("Erro ao fazer upload: " + err.message);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatusText("");
    }
  }, [appId, currentPath, queryClient, refetch]);

  // Download de item individual
  const handleDownloadFile = useCallback(async (item: IFileInfo) => {
    try {
      const fileData = await readFileContentFn({ data: { appId, filePath: item.path } });
      const byteChars = fileData.encoding === "base64" 
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
  }, [appId]);

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

  const handleSaveEditorContent = useCallback(async (filePath: string, content: string, expectedSha256?: string, force?: boolean) => {
    const res = await saveFileContentFn({
      data: { appId, filePath, content, expectedSha256, force: Boolean(force) },
    });
    queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
    refetch();
    return { sha256: res.sha256, mtime: res.mtime };
  }, [appId, queryClient, refetch]);

  const handleReloadEditorFile = useCallback(async (filePath: string) => {
    const refreshed = await readFileContentFn({ data: { appId, filePath } });
    setActiveEditorFile(refreshed);
    return refreshed;
  }, [appId]);

  return {
    currentPath,
    setCurrentPath,
    history,
    historyIndex,
    showHidden,
    setShowHidden,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedPaths,
    setSelectedPaths,
    isEditorOpen,
    setIsEditorOpen,
    activeEditorFile,
    setActiveEditorFile,
    isChmodOpen,
    setIsChmodOpen,
    activeChmodFile,
    setActiveChmodFile,
    isPropertiesOpen,
    setIsPropertiesOpen,
    activePropertiesFile,
    setActivePropertiesFile,
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
    fileInputRef,
    isUploading,
    uploadProgress,
    uploadStatusText,
    fileListData,
    isLoading,
    isFetching,
    refetch,
    docRoot,
    navigateTo,
    navigateBack,
    navigateForward,
    navigateUp,
    breadcrumbSegments,
    filteredAndSortedItems,
    toggleSelect,
    selectedPathsSet,
    isAllSelected,
    isSomeSelected,
    handleToggleSelectAll,
    createFileMutation,
    createFolderMutation,
    deleteMutation,
    renameMutation,
    moveMutation,
    copyMutation,
    chmodMutation,
    activeJob,
    isJobModalOpen,
    setIsJobModalOpen,
    isExtractConflictModalOpen,
    setIsExtractConflictModalOpen,
    pendingExtractPath,
    setPendingExtractPath,
    handleStartExtractJob,
    handleStartCompressJob,
    handleCancelActiveJob,
    handleOpenExtract,
    handleOpenFileForEdit,
    handleUploadFiles,
    handleDownloadFile,
    handleOpenChmod,
    handleOpenRename,
    handleOpenProperties,
    handleDeleteSingle,
    handleRefreshFiles,
    handleSaveEditorContent,
    handleReloadEditorFile,
  };
}
