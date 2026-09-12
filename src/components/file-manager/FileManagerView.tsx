import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen,
  CheckSquare,
  Square,
  MinusSquare,
  Loader2,
} from "lucide-react";
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
import { CodeEditorModal } from "./CodeEditorModal";
import { ChmodModal } from "./ChmodModal";
import { FilePropertiesModal } from "./FilePropertiesModal";
import { FileRowItem } from "./FileManagerItemRow";
import { FileManagerToolbar } from "./FileManagerToolbar";
import { FileManagerDropzone } from "./FileManagerDropzone";
import { FileManagerDialogs } from "./FileManagerDialogs";

export interface FileManagerViewProps {
  appId: string;
  containerRoot?: string;
}

export function FileManagerView({ appId, containerRoot }: FileManagerViewProps) {
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
  const navigateTo = (newPath: string) => {
    const clean = newPath.replace(/^[\/\\]+|[\/\\]+$/g, "");
    if (clean === currentPath) return;
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(clean);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
    setCurrentPath(clean);
  };

  const navigateBack = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setCurrentPath(history[prevIdx] || "");
    }
  };

  const navigateForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setCurrentPath(history[nextIdx] || "");
    }
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split("/");
    parts.pop();
    navigateTo(parts.join("/"));
  };

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
  const handleStartExtractJob = async (archivePath: string, conflictPolicy: "overwrite" | "skip" | "abort" = "overwrite") => {
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
  };

  // Iniciar Compressão Assíncrona com Job
  const handleStartCompressJob = async (paths: string[], archiveName: string) => {
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
  };

  // Cancelar Job Ativo
  const handleCancelActiveJob = async () => {
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
  };

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
  const handleUploadFiles = async (files: FileList | null) => {
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
        return parseFloat((bytes / Math.pow(k, idx)).toFixed(1)) + " " + sizes[idx];
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
  };

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

  return (
    <div className="space-y-4">
      {/* Barra de Ferramentas, Breadcrumbs e Ações em Massa */}
      <FileManagerToolbar
        historyIndex={historyIndex}
        historyLength={history.length}
        currentPath={currentPath}
        navigateBack={navigateBack}
        navigateForward={navigateForward}
        navigateUp={navigateUp}
        isFetching={isFetching}
        onRefresh={async () => {
          try {
            toast.loading("Sincronizando com o container...", { id: "sync-refresh" });
            await forcePullFilesFromSwarmFn({ data: { appId } }).catch(() => {});
            await refetch();
            toast.success("Arquivos sincronizados com o container!", { id: "sync-refresh" });
          } catch {
            refetch();
          }
        }}
        onOpenNewFolder={() => setIsNewFolderModalOpen(true)}
        onOpenNewFile={() => setIsNewFileModalOpen(true)}
        onTriggerUpload={() => fileInputRef.current?.click()}
        showHidden={showHidden}
        onToggleShowHidden={() => setShowHidden((p) => !p)}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        docRoot={docRoot}
        breadcrumbSegments={breadcrumbSegments}
        onNavigate={navigateTo}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPaths={selectedPaths}
        onCopy={() => {
          setMoveCopyAction("copy");
          setTargetDirectoryInput(currentPath);
          setIsMoveCopyModalOpen(true);
        }}
        onMove={() => {
          setMoveCopyAction("move");
          setTargetDirectoryInput(currentPath);
          setIsMoveCopyModalOpen(true);
        }}
        onCompress={() => {
          setCompressArchiveName(currentPath ? `${currentPath.split("/").pop()}.zip` : "pacote.zip");
          setIsCompressModalOpen(true);
        }}
        onDeleteSelected={() => {
          setDeleteConfirmState({
            isOpen: true,
            paths: selectedPaths,
            displayName: `${selectedPaths.length} item(ns) selecionados`,
          });
        }}
        deletePending={deleteMutation.isPending}
      />

      {/* Área de Listagem de Arquivos */}
      <div className="border rounded-3xl bg-card overflow-hidden shadow-sm">
        {/* Cabeçalho da Tabela */}
        <div className="p-3 px-6 bg-muted/40 border-b flex items-center justify-between text-xs font-bold text-muted-foreground select-none">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : isSomeSelected ? (
                <MinusSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground/60" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (sortBy === "name") setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                else { setSortBy("name"); setSortOrder("asc"); }
              }}
              className="hover:text-foreground transition-colors flex items-center gap-1 font-bold"
            >
              <span>Nome do Arquivo / Pasta</span>
              {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
          </div>

          <div className="flex items-center gap-8 text-right shrink-0">
            <button
              type="button"
              onClick={() => {
                if (sortBy === "size") setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                else { setSortBy("size"); setSortOrder("asc"); }
              }}
              className="hover:text-foreground transition-colors hidden sm:block w-24"
            >
              Tamanho {sortBy === "size" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>

            <button
              type="button"
              onClick={() => {
                if (sortBy === "permissions") setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                else { setSortBy("permissions"); setSortOrder("asc"); }
              }}
              className="hover:text-foreground transition-colors hidden md:block w-20"
            >
              Permissão {sortBy === "permissions" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>

            <button
              type="button"
              onClick={() => {
                if (sortBy === "mtime") setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                else { setSortBy("mtime"); setSortOrder("asc"); }
              }}
              className="hover:text-foreground transition-colors hidden lg:block w-32"
            >
              Modificado {sortBy === "mtime" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>

            <span className="w-36 text-center">Ações</span>
          </div>
        </div>

        {/* Conteúdo de Linhas de Arquivos */}
        <div className="divide-y">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs font-semibold">Consultando filesystem real do servidor...</p>
            </div>
          ) : filteredAndSortedItems.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-semibold">Nenhum arquivo encontrado neste diretório.</p>
              <p className="text-xs">Crie um novo arquivo, pasta ou faça upload abaixo.</p>
            </div>
          ) : (
            filteredAndSortedItems.map((item) => (
              <FileRowItem
                key={item.path}
                item={item}
                isSelected={selectedPathsSet.has(item.path)}
                onToggleSelect={toggleSelect}
                onNavigate={navigateTo}
                onOpenFileForEdit={handleOpenFileForEdit}
                onOpenChmod={handleOpenChmod}
                onOpenExtract={handleOpenExtract}
                onOpenRename={handleOpenRename}
                onDownload={handleDownloadFile}
                onOpenProperties={handleOpenProperties}
                onDelete={handleDeleteSingle}
              />
            ))
          )}
        </div>

        {/* Dropzone de Upload */}
        <FileManagerDropzone
          fileInputRef={fileInputRef}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          uploadStatusText={uploadStatusText}
          docRoot={docRoot}
          currentPath={currentPath}
          onUploadFiles={handleUploadFiles}
        />
      </div>

      {/* Modais de Ações (Novo Arquivo, Pasta, Renomear, Mover/Copiar, Compactar, Extrair, Job, Exclusão) */}
      <FileManagerDialogs
        docRoot={docRoot}
        currentPath={currentPath}
        isNewFileModalOpen={isNewFileModalOpen}
        setIsNewFileModalOpen={setIsNewFileModalOpen}
        newFileName={newFileName}
        setNewFileName={setNewFileName}
        onCreateFile={(name) => createFileMutation.mutate(name)}
        createFilePending={createFileMutation.isPending}
        isNewFolderModalOpen={isNewFolderModalOpen}
        setIsNewFolderModalOpen={setIsNewFolderModalOpen}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        onCreateFolder={(name) => createFolderMutation.mutate(name)}
        createFolderPending={createFolderMutation.isPending}
        isRenameModalOpen={isRenameModalOpen}
        setIsRenameModalOpen={setIsRenameModalOpen}
        renameTarget={renameTarget}
        renameNewName={renameNewName}
        setRenameNewName={setRenameNewName}
        onRename={(oldPath, newName) => renameMutation.mutate({ oldPath, newName })}
        renamePending={renameMutation.isPending}
        isMoveCopyModalOpen={isMoveCopyModalOpen}
        setIsMoveCopyModalOpen={setIsMoveCopyModalOpen}
        moveCopyAction={moveCopyAction}
        selectedPathsCount={selectedPaths.length}
        targetDirectoryInput={targetDirectoryInput}
        setTargetDirectoryInput={setTargetDirectoryInput}
        onMoveCopy={() => {
          if (moveCopyAction === "move") {
            moveMutation.mutate({ paths: selectedPaths, targetDir: targetDirectoryInput.trim() });
          } else {
            copyMutation.mutate({ paths: selectedPaths, targetDir: targetDirectoryInput.trim() });
          }
        }}
        moveCopyPending={moveMutation.isPending || copyMutation.isPending}
        isCompressModalOpen={isCompressModalOpen}
        setIsCompressModalOpen={setIsCompressModalOpen}
        compressArchiveName={compressArchiveName}
        setCompressArchiveName={setCompressArchiveName}
        onCompress={(archiveName) => handleStartCompressJob(selectedPaths, archiveName)}
        compressRunning={activeJob?.status === "running"}
        isExtractConflictModalOpen={isExtractConflictModalOpen}
        setIsExtractConflictModalOpen={setIsExtractConflictModalOpen}
        pendingExtractPath={pendingExtractPath}
        onStartExtractJob={handleStartExtractJob}
        onCancelExtract={() => {
          setIsExtractConflictModalOpen(false);
          setPendingExtractPath(null);
        }}
        isJobModalOpen={isJobModalOpen}
        activeJob={activeJob}
        onCancelActiveJob={handleCancelActiveJob}
        deleteConfirmState={deleteConfirmState}
        setDeleteConfirmState={setDeleteConfirmState}
        onConfirmDelete={(paths) => deleteMutation.mutate(paths)}
      />

      {/* Modais Especializados de Edição de Código, Permissões e Propriedades */}
      <CodeEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        fileData={activeEditorFile}
        documentRoot={docRoot}
        onSave={async (filePath, content, expectedSha256, force) => {
          const res = await saveFileContentFn({
            data: { appId, filePath, content, expectedSha256, force: Boolean(force) },
          });
          queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
          refetch();
          return { sha256: res.sha256, mtime: res.mtime };
        }}
        onReload={async (filePath) => {
          const refreshed = await readFileContentFn({ data: { appId, filePath } });
          setActiveEditorFile(refreshed);
          return refreshed;
        }}
      />

      <ChmodModal
        isOpen={isChmodOpen}
        onClose={() => {
          setIsChmodOpen(false);
          setActiveChmodFile(null);
        }}
        file={activeChmodFile}
        onSave={async (path, modeOctal) => {
          await chmodMutation.mutateAsync({ path, modeOctal });
        }}
        isLoading={chmodMutation.isPending}
      />

      <FilePropertiesModal
        isOpen={isPropertiesOpen}
        onClose={() => {
          setIsPropertiesOpen(false);
          setActivePropertiesFile(null);
        }}
        file={activePropertiesFile}
        documentRoot={docRoot}
      />
    </div>
  );
}
