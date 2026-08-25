import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen,
  FolderPlus,
  FilePlus,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Search,
  Upload,
  Download,
  Trash2,
  Copy,
  Folder,
  FolderArchive,
  Code2,
  ShieldCheck,
  Info,
  Edit2,
  FileCode,
  FileText,
  KeyRound,
  CheckSquare,
  Square,
  MinusSquare,
  Eye,
  EyeOff,
  LayoutList,
  LayoutGrid,
  Loader2,
  ChevronRight,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  compressItemsFn,
  extractArchiveFn,
  uploadFilesBatchFn,
} from "@/lib/file-manager/functions";
import type { IFileInfo, IFileListResult, IFileReadResult } from "@/lib/file-manager/types";
import { CodeEditorModal } from "./CodeEditorModal";
import { ChmodModal } from "./ChmodModal";
import { FilePropertiesModal } from "./FilePropertiesModal";

interface FileManagerViewProps {
  appId: string;
}

export function FileManagerView({ appId }: FileManagerViewProps) {
  const queryClient = useQueryClient();

  // Estados de navegação
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

  // Estados de Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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
  const toggleSelect = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  // Selecionar Todos
  const isAllSelected =
    filteredAndSortedItems.length > 0 &&
    filteredAndSortedItems.every((item) => selectedPaths.includes(item.path));
  const isSomeSelected =
    filteredAndSortedItems.some((item) => selectedPaths.includes(item.path)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPaths([]);
    } else {
      setSelectedPaths(filteredAndSortedItems.map((item) => item.path));
    }
  };

  // Ícones por extensão
  const getItemIcon = (item: IFileInfo) => {
    if (item.type === "directory") {
      return <Folder className="h-5 w-5 text-amber-500 fill-amber-500/20" />;
    }
    const ext = item.name.split(".").pop()?.toLowerCase() || "";
    if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) {
      return <FolderArchive className="h-5 w-5 text-amber-500" />;
    }
    if (["html", "htm"].includes(ext)) {
      return <FileCode className="h-5 w-5 text-orange-500" />;
    }
    if (["css", "scss", "sass"].includes(ext)) {
      return <FileCode className="h-5 w-5 text-sky-400" />;
    }
    if (["js", "ts", "jsx", "tsx"].includes(ext)) {
      return <FileCode className="h-5 w-5 text-amber-400" />;
    }
    if (["json"].includes(ext)) {
      return <FileCode className="h-5 w-5 text-emerald-400" />;
    }
    if (["php"].includes(ext)) {
      return <FileCode className="h-5 w-5 text-indigo-400" />;
    }
    if (["env"].includes(ext)) {
      return <KeyRound className="h-5 w-5 text-purple-400" />;
    }
    if (["md", "txt"].includes(ext)) {
      return <FileText className="h-5 w-5 text-zinc-400" />;
    }
    return <FileText className="h-5 w-5 text-primary" />;
  };

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
        const res = await fetch(`/api/file-manager/jobs/${activeJob.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.job) {
          setActiveJob(data.job);
          if (data.job.status === "completed") {
            toast.success(
              data.job.type === "extract"
                ? `✓ Descompactação concluída com sucesso (${data.job.resultSummary?.extractedCount || data.job.totalFiles} arquivos)!`
                : `✓ Compressão concluída com sucesso (${data.job.resultSummary?.totalPacked || data.job.totalFiles} arquivos)!`
            );
            queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
            refetch();
            setTimeout(() => {
              setIsJobModalOpen(false);
              setActiveJob(null);
            }, 1000);
          } else if (data.job.status === "failed") {
            toast.error(`✕ Falha no processamento: ${data.job.error}`);
            setTimeout(() => {
              setIsJobModalOpen(false);
              setActiveJob(null);
            }, 2500);
          } else if (data.job.status === "cancelled") {
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
  }, [activeJob?.id, activeJob?.status]);

  // Iniciar Extração Assíncrona com Job
  const handleStartExtractJob = async (archivePath: string, conflictPolicy: "overwrite" | "skip" | "abort" = "overwrite") => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const res = await fetch("/api/file-manager/jobs/extract", {
        method: "POST",
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
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao iniciar descompactação.");
      }

      setActiveJob(data.job);
      setIsJobModalOpen(true);
      setIsExtractConflictModalOpen(false);
      setPendingExtractPath(null);
    } catch (err: any) {
      toast.error("Erro ao iniciar descompactação: " + err.message);
    }
  };

  // Iniciar Compressão Assíncrona com Job
  const handleStartCompressJob = async (paths: string[], archiveName: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch("/api/file-manager/jobs/compress", {
        method: "POST",
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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      await fetch(`/api/file-manager/jobs/${activeJob.id}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      toast.info("Cancelamento solicitado...");
    } catch (err: any) {
      toast.error("Erro ao solicitar cancelamento: " + err.message);
    }
  };

  // Abrir arquivo para edição
  const handleOpenFileForEdit = async (filePath: string) => {
    try {
      const fileData = await readFileContentFn({ data: { appId, filePath } });
      setActiveEditorFile(fileData);
      setIsEditorOpen(true);
    } catch (err: any) {
      toast.error("Erro ao abrir arquivo: " + err.message);
    }
  };

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
        totalBytesAllFiles += files[i].size;
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
  const handleDownloadFile = async (item: IFileInfo) => {
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
  };

  return (
    <div className="space-y-4">
      {/* 1. BARRA DE FERRAMENTAS PRINCIPAL (Estilo cPanel / DirectAdmin) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border rounded-3xl shadow-sm">
        {/* Controles de Navegação */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={historyIndex <= 0}
            onClick={navigateBack}
            className="rounded-xl h-8 w-8 p-0"
            title="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={historyIndex >= history.length - 1}
            onClick={navigateForward}
            className="rounded-xl h-8 w-8 p-0"
            title="Avançar"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={!currentPath}
            onClick={navigateUp}
            className="rounded-xl h-8 w-8 p-0"
            title="Subir um nível de diretório"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl h-8 px-2.5 text-xs font-semibold gap-1.5"
            title="Atualizar filesystem"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>

        {/* Ações de Criação e Upload */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="rounded-xl h-8 px-3 text-xs font-semibold gap-1.5 border-primary/30 hover:bg-primary/5"
          >
            <FolderPlus className="h-3.5 w-3.5 text-primary" />
            <span>Nova Pasta</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsNewFileModalOpen(true)}
            className="rounded-xl h-8 px-3 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <FilePlus className="h-3.5 w-3.5" />
            <span>Novo Arquivo</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl h-8 px-3 text-xs font-semibold gap-1.5 bg-muted/40 hover:bg-muted"
          >
            <Upload className="h-3.5 w-3.5 text-foreground" />
            <span>Upload</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowHidden((p) => !p)}
            className="rounded-xl h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            title={showHidden ? "Ocultar arquivos com ponto (.env, .htaccess)" : "Mostrar arquivos ocultos"}
          >
            {showHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>

          <div className="border-l pl-2 flex items-center gap-1">
            <Button
              size="sm"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              onClick={() => setViewMode("list")}
              className="rounded-xl h-8 w-8 p-0"
              title="Visualização em Lista"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              onClick={() => setViewMode("grid")}
              className="rounded-xl h-8 w-8 p-0"
              title="Visualização em Grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE BREADCRUMBS & BUSCA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 px-4 bg-muted/30 border rounded-2xl text-xs">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 font-mono">
          <button
            type="button"
            onClick={() => navigateTo("")}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted transition-colors font-bold ${
              !currentPath ? "text-primary bg-primary/10" : "text-muted-foreground"
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5 text-primary" />
            <span>/var/www/html</span>
          </button>

          {breadcrumbSegments.map((segment, idx) => (
            <React.Fragment key={segment.path}>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <button
                type="button"
                onClick={() => navigateTo(segment.path)}
                className={`px-2 py-1 rounded-lg hover:bg-muted transition-colors font-medium ${
                  idx === breadcrumbSegments.length - 1 ? "text-primary font-bold bg-primary/10" : "text-foreground"
                }`}
              >
                {segment.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Campo de Filtro e Busca Rápida */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filtrar arquivos no diretório..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 rounded-xl text-xs bg-background"
          />
        </div>
      </div>

      {/* 3. BARRA DE AÇÕES EM MASSA (Quando houver seleção) */}
      {selectedPaths.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 p-3 px-5 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-bold px-2.5 py-0.5 font-mono">
              {selectedPaths.length} selecionado(s)
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Ações em lote no servidor:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setMoveCopyAction("copy");
                setTargetDirectoryInput(currentPath);
                setIsMoveCopyModalOpen(true);
              }}
              className="rounded-xl h-7 text-xs gap-1.5 font-semibold"
            >
              <Copy className="h-3 w-3" /> Copiar
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setMoveCopyAction("move");
                setTargetDirectoryInput(currentPath);
                setIsMoveCopyModalOpen(true);
              }}
              className="rounded-xl h-7 text-xs gap-1.5 font-semibold"
            >
              <Folder className="h-3 w-3" /> Mover
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCompressArchiveName(currentPath ? `${currentPath.split("/").pop()}.zip` : "pacote.zip");
                setIsCompressModalOpen(true);
              }}
              className="rounded-xl h-7 text-xs gap-1.5 font-semibold"
            >
              <Archive className="h-3 w-3" /> Compactar (ZIP)
            </Button>

            <Button
              size="sm"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm(`Deseja realmente excluir permanentemente os ${selectedPaths.length} item(ns) selecionados no servidor?`)) {
                  deleteMutation.mutate(selectedPaths);
                }
              }}
              className="rounded-xl h-7 text-xs gap-1.5 font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Trash2 className="h-3 w-3" /> Excluir ({selectedPaths.length})
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedPaths([])}
              className="rounded-xl h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Limpar
            </Button>
          </div>
        </div>
      )}

      {/* 4. ÁREA DE LISTAGEM DE ARQUIVOS */}
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
            filteredAndSortedItems.map((item) => {
              const isSelected = selectedPaths.includes(item.path);
              const ext = item.name.split(".").pop()?.toLowerCase() || "";
              const isZip = ["zip", "tar", "gz"].includes(ext);

              return (
                <div
                  key={item.path}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 px-6 gap-3 transition-colors group ${
                    isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.path);
                      }}
                      className="cursor-pointer text-muted-foreground hover:text-foreground p-0.5"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </button>

                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        if (item.type === "directory") {
                          navigateTo(item.path);
                        } else {
                          handleOpenFileForEdit(item.path);
                        }
                      }}
                    >
                      <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        {getItemIcon(item)}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors font-mono truncate">
                            {item.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 shrink-0">
                            {item.type === "directory" ? "DIR" : ext || "FILE"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                          /var/www/html/{item.path}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-8 shrink-0 text-xs">
                    <span className="font-mono text-muted-foreground hidden sm:block w-24 text-right">
                      {item.sizeFormatted}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveChmodFile(item);
                        setIsChmodOpen(true);
                      }}
                      className="font-mono text-muted-foreground hover:text-primary hidden md:block w-20 text-right underline-offset-2 hover:underline"
                      title="Clique para alterar permissão"
                    >
                      {item.permissions}
                    </button>

                    <span className="font-mono text-muted-foreground hidden lg:block w-32 text-right">
                      {new Date(item.mtime).toLocaleDateString("pt-BR")}
                    </span>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1 w-36 justify-end">
                      {item.type !== "directory" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenFileForEdit(item.path)}
                          className="rounded-xl h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          title="Editar Código"
                        >
                          <Code2 className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {isZip && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setPendingExtractPath(item.path);
                            setIsExtractConflictModalOpen(true);
                          }}
                          className="rounded-xl h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                          title="Extrair Arquivo Compactado com Job Assíncrono"
                        >
                          <FolderArchive className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setRenameTarget(item);
                          setRenameNewName(item.name);
                          setIsRenameModalOpen(true);
                        }}
                        className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Renomear (F2)"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      {item.type !== "directory" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDownloadFile(item)}
                          className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setActivePropertiesFile(item);
                          setIsPropertiesOpen(true);
                        }}
                        className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Propriedades"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Deseja realmente excluir ${item.name} do servidor?`)) {
                            deleteMutation.mutate([item.path]);
                          }
                        }}
                        className="rounded-xl h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. DROPZONE DE UPLOAD */}
        <div className="p-6 border-t bg-muted/10">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleUploadFiles(e.target.files)}
            multiple
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              handleUploadFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-card cursor-pointer ${
              isDraggingOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-primary/30 hover:border-primary/60 hover:bg-muted/30"
            }`}
          >
            {isUploading ? (
              <div className="space-y-4 py-4 max-w-md mx-auto">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-foreground truncate max-w-[280px]">
                    <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                    <span className="truncate">{uploadStatusText || "Processando upload..."}</span>
                  </span>
                  <span className="font-mono text-primary font-bold">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2.5 rounded-full" />
                <p className="text-[11px] text-muted-foreground">
                  Gravando diretamente no filesystem real em <code>/var/www/html/{currentPath}</code>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
                  <Upload className="h-6 w-6" />
                </div>
                <h5 className="font-bold text-sm text-foreground">Upload de Arquivos & Pacotes .ZIP</h5>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Arraste arquivos ou clique para selecionar do computador. Os arquivos são salvos diretamente em <code>/var/www/html/{currentPath}</code>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. MODAIS AUXILIARES */}

      {/* Modal de Novo Arquivo */}
      <Dialog open={isNewFileModalOpen} onOpenChange={setIsNewFileModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-primary" /> Criar Novo Arquivo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe o nome do arquivo a ser criado em <code>/var/www/html/{currentPath}</code>
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newFileName.trim()) createFileMutation.mutate(newFileName.trim());
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label>Nome do Arquivo</Label>
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="index.php, script.js, .env"
                className="rounded-xl font-mono text-xs"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewFileModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={createFileMutation.isPending || !newFileName.trim()} className="rounded-xl font-bold bg-primary">
                Criar Arquivo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Pasta */}
      <Dialog open={isNewFolderModalOpen} onOpenChange={setIsNewFolderModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" /> Criar Nova Pasta
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe o nome do novo diretório em <code>/var/www/html/{currentPath}</code>
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newFolderName.trim()) createFolderMutation.mutate(newFolderName.trim());
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label>Nome da Pasta</Label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="assets, images, config"
                className="rounded-xl font-mono text-xs"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewFolderModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={createFolderMutation.isPending || !newFolderName.trim()} className="rounded-xl font-bold bg-primary">
                Criar Pasta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Renomear */}
      <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" /> Renomear Item
            </DialogTitle>
            <DialogDescription className="text-xs">
              Altere o nome de <strong>{renameTarget?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (renameTarget && renameNewName.trim()) {
                renameMutation.mutate({ oldPath: renameTarget.path, newName: renameNewName.trim() });
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label>Novo Nome</Label>
              <Input
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                className="rounded-xl font-mono text-xs"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRenameModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={renameMutation.isPending || !renameNewName.trim()} className="rounded-xl font-bold bg-primary">
                Renomear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Mover / Copiar */}
      <Dialog open={isMoveCopyModalOpen} onOpenChange={setIsMoveCopyModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {moveCopyAction === "move" ? <Folder className="h-5 w-5 text-primary" /> : <Copy className="h-5 w-5 text-primary" />}
              {moveCopyAction === "move" ? "Mover Itens Selecionados" : "Copiar Itens Selecionados"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {moveCopyAction === "move" ? "Mover" : "Copiar"} {selectedPaths.length} item(ns) para um diretório de destino.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (moveCopyAction === "move") {
                moveMutation.mutate({ paths: selectedPaths, targetDir: targetDirectoryInput.trim() });
              } else {
                copyMutation.mutate({ paths: selectedPaths, targetDir: targetDirectoryInput.trim() });
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label>Diretório de Destino (em branco para raiz /var/www/html)</Label>
              <Input
                value={targetDirectoryInput}
                onChange={(e) => setTargetDirectoryInput(e.target.value)}
                placeholder="ex: assets/css ou js"
                className="rounded-xl font-mono text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMoveCopyModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={moveMutation.isPending || copyMutation.isPending} className="rounded-xl font-bold bg-primary">
                {moveCopyAction === "move" ? "Mover" : "Copiar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Compactação com Job Assíncrono */}
      <Dialog open={isCompressModalOpen} onOpenChange={setIsCompressModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary" /> Compactar em Arquivo ZIP
            </DialogTitle>
            <DialogDescription className="text-xs">
              Compactar {selectedPaths.length} item(ns) selecionado(s) em um arquivo .ZIP
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (compressArchiveName.trim()) {
                handleStartCompressJob(selectedPaths, compressArchiveName.trim());
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label>Nome do Arquivo ZIP</Label>
              <Input
                value={compressArchiveName}
                onChange={(e) => setCompressArchiveName(e.target.value)}
                placeholder="backup.zip ou meu-site.zip"
                className="rounded-xl font-mono text-xs"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCompressModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={!compressArchiveName.trim() || activeJob?.status === "running"} className="rounded-xl font-bold bg-primary">
                Compactar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Conflito de Extração */}
      <Dialog open={isExtractConflictModalOpen} onOpenChange={setIsExtractConflictModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FolderArchive className="h-5 w-5 text-amber-500" /> Descompactar Arquivo ZIP
            </DialogTitle>
            <DialogDescription className="text-xs">
              Como deseja proceder caso existam arquivos com o mesmo nome no diretório <code>/var/www/html/{currentPath}</code>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs font-mono text-muted-foreground p-2.5 rounded-xl bg-muted/50 truncate">
              Arquivo: {pendingExtractPath}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                onClick={() => pendingExtractPath && handleStartExtractJob(pendingExtractPath, "overwrite")}
                className="rounded-xl font-bold bg-primary text-primary-foreground justify-start"
              >
                ✓ Substituir Tudo (Recomendado)
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => pendingExtractPath && handleStartExtractJob(pendingExtractPath, "skip")}
                className="rounded-xl font-medium justify-start"
              >
                ↷ Ignorar Arquivos Existentes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsExtractConflictModalOpen(false);
                  setPendingExtractPath(null);
                }}
                className="rounded-xl font-medium justify-start text-muted-foreground"
              >
                ✕ Cancelar Operação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Progresso Real do Job (Descompactação / Compressão) */}
      <Dialog open={isJobModalOpen} onOpenChange={() => {}}>
        <DialogContent className="rounded-3xl max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {activeJob?.type === "extract" ? (
                <FolderArchive className="h-5 w-5 text-amber-500 animate-pulse" />
              ) : (
                <Archive className="h-5 w-5 text-primary animate-pulse" />
              )}
              {activeJob?.type === "extract" ? "Descompactando Arquivos..." : "Compactando Arquivos..."}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Operação em segundo plano com monitoramento em tempo real do filesystem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-foreground truncate max-w-[280px]">
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                <span className="truncate">
                  {activeJob?.currentFile || (activeJob?.status === "running" ? "Processando arquivos..." : "Iniciando Job...")}
                </span>
              </span>
              <span className="font-mono text-primary font-bold">{activeJob?.progress || 0}%</span>
            </div>

            <Progress value={activeJob?.progress || 0} className="h-3 rounded-full" />

            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>
                Arquivos: {activeJob?.processedFiles || 0} / {activeJob?.totalFiles || 0}
              </span>
              <span className="capitalize font-semibold text-primary">{activeJob?.status || "executando"}</span>
            </div>

            {activeJob?.status === "running" && (
              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleCancelActiveJob}
                  className="rounded-xl text-xs font-medium"
                >
                  Cancelar Operação
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 7. MODAIS DE EDIÇÃO, PERMISSÕES E PROPRIEDADES */}
      <CodeEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        fileData={activeEditorFile}
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
      />
    </div>
  );
}
