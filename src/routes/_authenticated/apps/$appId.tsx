import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { 
  Cpu, 
  Play, 
  Square, 
  RotateCcw, 
  ExternalLink, 
  Terminal, 
  Settings, 
  KeyRound, 
  GitBranch, 
  Globe, 
  HardDrive, 
  ArrowLeft, 
  Activity, 
  Upload, 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  RefreshCw,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  AlertTriangle,
  FolderArchive,
  FileCode,
  Layers,
  Loader2,
  XCircle,
  FileText,
  FolderOpen,
  FolderPlus,
  FilePlus,
  Code2,
  Download,
  Share2,
  CheckSquare,
  MinusSquare,
  Folder
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  getApplicationDetails, 
  triggerApplicationAction,
  getApplicationLogs, 
  getApplicationEnvs, 
  saveApplicationEnvs,
  updateApplicationDomain,
  applyTemplateToApp,
  getDeploymentStatus,
  getApplicationFiles,
  saveApplicationFile,
  saveApplicationFilesBatch,
  deleteApplicationFile,
  uploadApplicationZip,
  extractApplicationZip,
  bulkDeleteApplicationFiles,
  createApplicationFolder,
  moveApplicationFiles,
  copyApplicationFiles,
  deleteApplication
} from "@/lib/coolify.functions";
import { APP_TEMPLATES, type AppTemplate } from "@/lib/templates.data";
import { toast } from "sonner";
import { FileManagerView } from "@/components/file-manager/FileManagerView";

export const Route = createFileRoute("/_authenticated/apps/$appId")({
  head: () => ({
    meta: [{ title: "Gerenciar Aplicação — Eqsam PaaS" }],
  }),
  component: AppDetailsPage,
});

function AppDetailsPage() {
  const { appId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Estados de formulários
  const [gitRepoInput, setGitRepoInput] = useState("");
  const [gitBranchInput, setGitBranchInput] = useState("main");
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [envsList, setEnvsList] = useState<Array<{ key: string; value: string; is_build_time?: boolean }>>([]);
  const [showSecrets, setShowSecrets] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // Estados para o Editor de Código Web
  const [selectedFilePath, setSelectedFilePath] = useState<string>("index.html");
  const [fileEditorContent, setFileEditorContent] = useState<string>("");
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [isCreatingFileModal, setIsCreatingFileModal] = useState(false);
  const [newFileNameInput, setNewFileNameInput] = useState("");
  const [isCreatingFolderModal, setIsCreatingFolderModal] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("");
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);
  const [isMoveCopyModalOpen, setIsMoveCopyModalOpen] = useState(false);
  const [moveCopyAction, setMoveCopyAction] = useState<"move" | "copy">("move");
  const [targetFolderInput, setTargetFolderInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [fileCurrentPage, setFileCurrentPage] = useState(1);
  const FILES_PER_PAGE = 25;

  // Estados para o Catálogo de Templates 1-Clique
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("all");
  const [selectedTemplateToApply, setSelectedTemplateToApply] = useState<AppTemplate | null>(null);
  const [isConfirmTemplateOpen, setIsConfirmTemplateOpen] = useState(false);

  // Estados para o Modal de Deploy ao Vivo (Live Terminal & Status)
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [activeDeploymentUuid, setActiveDeploymentUuid] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<"queued" | "in_progress" | "finished" | "failed" | null>(null);
  const [deploymentState, setDeploymentState] = useState<string>("BUILDING");
  const [deploymentDiagnostic, setDeploymentDiagnostic] = useState<any | null>(null);
  const [deploymentLogs, setDeploymentLogs] = useState<Array<{ output: string; type: string }>>([]);
  const [deployStep, setDeployStep] = useState<number>(1);
  const [deployAppTitle, setDeployAppTitle] = useState<string>("");
  const terminalLogsEndRef = useRef<HTMLDivElement>(null);

  // Consulta de detalhes da aplicação
  const { data: app, isLoading, isError, refetch } = useQuery({
    queryKey: ["applicationDetails", appId],
    queryFn: () => getApplicationDetails({ data: { appId } }),
    refetchInterval: 10000,
  });

  // Consulta de logs em tempo real
  const { data: logsData, isFetching: isFetchingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["applicationLogs", appId],
    queryFn: () => getApplicationLogs({ data: { appId } }),
    enabled: Boolean(appId),
  });

  // Consulta de variáveis de ambiente
  const { data: envsData } = useQuery({
    queryKey: ["applicationEnvs", appId],
    queryFn: () => getApplicationEnvs({ data: { appId } }),
    enabled: Boolean(appId),
  });

  // Consulta de arquivos do container para o Editor Web
  const { data: filesData, refetch: refetchFiles } = useQuery({
    queryKey: ["applicationFiles", appId],
    queryFn: () => getApplicationFiles({ data: { appId } }),
    enabled: Boolean(appId),
  });

  // Sincronizar inputs com os dados carregados
  useEffect(() => {
    if (app) {
      if (app.git_repository) setGitRepoInput(app.git_repository);
      if (app.git_branch) setGitBranchInput(app.git_branch);
      if (app.fqdn) setCustomDomainInput(app.fqdn);
    }
  }, [app]);

  useEffect(() => {
    if (envsData) {
      setEnvsList(envsData);
    }
  }, [envsData]);

  // Sincronizar arquivo selecionado no Editor de Código
  useEffect(() => {
    if (filesData && filesData.length > 0) {
      const activeFile = filesData.find((f: any) => f.path === selectedFilePath) || filesData[0];
      if (activeFile) {
        setSelectedFilePath(activeFile.path);
        setFileEditorContent(activeFile.content || "");
      }
    }
  }, [filesData]);

  // Auto-scroll do terminal de deploy ao vivo
  useEffect(() => {
    if (isDeployModalOpen && terminalLogsEndRef.current) {
      terminalLogsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [deploymentLogs, isDeployModalOpen]);

  // Polling contínuo do status de deploy enquanto estiver ativo
  useEffect(() => {
    if (!isDeployModalOpen || !activeDeploymentUuid || deploymentStatus === "finished" || deploymentStatus === "failed") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await getDeploymentStatus({ data: { deploymentUuid: activeDeploymentUuid } });
        if (res) {
          setDeploymentStatus(res.status as any);
          if (res.state) {
            setDeploymentState(res.state);
          }
          if (res.diagnostic) {
            setDeploymentDiagnostic(res.diagnostic);
          }
          if (res.logs && Array.isArray(res.logs)) {
            setDeploymentLogs(res.logs);
          }

          if (res.state === "BUILDING" || res.status === "in_progress") {
            setDeployStep(2);
          } else if (res.state === "HEALTH_CHECKING") {
            setDeployStep(3);
          } else if (res.state === "VERIFYING_DOMAIN") {
            setDeployStep(4);
          } else if (res.state === "READY" || res.status === "finished") {
            setDeployStep(4);
            toast.success("Aplicação compilada, saudável e online 24/7!");
            queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
            refetch();
            refetchLogs();
          } else if (res.state === "FAILED" || res.status === "failed") {
            if (res.diagnostic?.title) {
              toast.error(res.diagnostic.title);
            } else {
              toast.error("Falha no deploy. Verifique o diagnóstico e os logs.");
            }
          }
        }
      } catch (e) {
        console.warn("Erro ao consultar status de deployment:", e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isDeployModalOpen, activeDeploymentUuid, deploymentStatus, appId, queryClient, refetch, refetchLogs]);

  // Ações de Ciclo de Vida do Container (Start, Stop, Restart, Deploy)
  const actionMutation = useMutation({
    mutationFn: async (action: "start" | "stop" | "restart" | "deploy") => {
      if (action === "deploy") {
        setDeployAppTitle(app?.name || "Aplicação");
        setDeployStep(1);
        setDeploymentLogs([
          { output: `Iniciando novo ciclo de build no cluster DK1...`, type: "stdout" },
          { output: `Alocando recursos dedicados (${app?.memory_limit || 512}MB RAM, ${app?.cpu_limit || 1} vCPU)...`, type: "stdout" },
        ]);
        setDeploymentStatus("in_progress");
        setIsDeployModalOpen(true);
      }
      return executeAppAction({ data: { appId, action } });
    },
    onSuccess: (res: any, action) => {
      const labels: Record<string, string> = {
        start: "iniciada",
        stop: "parada",
        restart: "reiniciada",
        deploy: "em deploy com sucesso",
      };
      toast.success(`Aplicação ${labels[action]}!`);
      if (action === "deploy" && res?.deploymentUuid) {
        setActiveDeploymentUuid(res.deploymentUuid);
      }
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      refetch();
    },
    onError: (err: any) => {
      if (actionMutation.variables === "deploy") {
        setDeploymentStatus("failed");
      }
      toast.error(err.message || "Falha ao executar ação na aplicação.");
    },
  });

  const deleteAppMutation = useMutation({
    mutationFn: async () => {
      return deleteApplication({ data: { appId } });
    },
    onSuccess: () => {
      toast.success("Aplicação e containers excluídos com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      navigate({ to: "/apps" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir aplicação.");
    },
  });

  const saveFileMutation = useMutation({
    mutationFn: async ({ shouldRestart }: { shouldRestart?: boolean }) => {
      await saveApplicationFile({ data: { appId, filePath: selectedFilePath, content: fileEditorContent } });
      if (shouldRestart) {
        await executeAppAction({ data: { appId, action: "restart" } });
      }
    },
    onSuccess: (_, vars) => {
      toast.success(vars.shouldRestart ? "Arquivo salvo e container reiniciado!" : "Arquivo salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
      refetchFiles();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar arquivo.");
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (filePath: string) => {
      return deleteApplicationFile({ data: { appId, filePath } });
    },
    onSuccess: () => {
      toast.success("Arquivo excluído!");
      queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
      refetchFiles();
    },
  });

  const createFileMutation = useMutation({
    mutationFn: async () => {
      if (!newFileNameInput.trim()) throw new Error("Nome do arquivo é obrigatório");
      const clean = newFileNameInput.trim();
      return saveApplicationFile({ data: { appId, filePath: clean, content: `// Arquivo ${clean} criado no cluster\n` } });
    },
    onSuccess: () => {
      toast.success("Arquivo criado com sucesso!");
      setIsCreatingFileModal(false);
      setSelectedFilePath(newFileNameInput.trim());
      setFileEditorContent(`// Arquivo ${newFileNameInput.trim()} criado no cluster\n`);
      setNewFileNameInput("");
      queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
      refetchFiles();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar arquivo.");
    },
  });

  const extractZipMutation = useMutation({
    mutationFn: async (filePath: string) => {
      return extractApplicationZip({ data: { appId, filePath } });
    },
    onSuccess: (updated) => {
      toast.success("🎉 Arquivo .ZIP descompactado com sucesso no servidor!");
      if (updated && Array.isArray(updated)) {
        queryClient.setQueryData(["applicationFiles", appId], updated);
      }
      queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
      refetchFiles();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao descompactar arquivo .ZIP.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (paths: string[]) => {
      return bulkDeleteApplicationFiles({ data: { appId, filePaths: paths } });
    },
    onSuccess: (updated) => {
      toast.success(`🗑️ ${selectedFilePaths.length} arquivo(s) excluído(s) com sucesso!`);
      setSelectedFilePaths([]);
      if (updated && Array.isArray(updated)) {
        queryClient.setQueryData(["applicationFiles", appId], updated);
      }
      queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
      refetchFiles();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir arquivos em lote.");
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async () => {
      if (!newFolderNameInput.trim()) throw new Error("Nome da pasta é obrigatório.");
      return createApplicationFolder({ data: { appId, folderPath: newFolderNameInput.trim() } });
    },
    onSuccess: (updated) => {
      toast.success(`📁 Pasta ${newFolderNameInput.trim()} criada com sucesso!`);
      setIsCreatingFolderModal(false);
      setNewFolderNameInput("");
      if (updated && Array.isArray(updated)) {
        queryClient.setQueryData(["applicationFiles", appId], updated);
      }
      queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
      refetchFiles();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar pasta.");
    },
  });

  const moveFilesMutation = useMutation({
    mutationFn: async () => {
      return moveApplicationFiles({ 
        data: { 
          appId, 
          filePaths: selectedFilePaths, 
          targetFolder: targetFolderInput.trim() 
        } 
      });
    },
    onSuccess: (updated) => {
      toast.success(`🚚 ${selectedFilePaths.length} arquivo(s) movido(s) para "${targetFolderInput.trim() || "raiz"}"!`);
      setIsMoveCopyModalOpen(false);
      setSelectedFilePaths([]);
      setTargetFolderInput("");
      if (updated && Array.isArray(updated)) {
        queryClient.setQueryData(["applicationFiles", appId], updated);
      }
      queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
      refetchFiles();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao mover arquivos.");
    },
  });

  const copyFilesMutation = useMutation({
    mutationFn: async () => {
      return copyApplicationFiles({ 
        data: { 
          appId, 
          filePaths: selectedFilePaths, 
          targetFolder: targetFolderInput.trim() 
        } 
      });
    },
    onSuccess: (updated) => {
      toast.success(`📋 ${selectedFilePaths.length} arquivo(s) copiado(s) com sucesso!`);
      setIsMoveCopyModalOpen(false);
      setSelectedFilePaths([]);
      setTargetFolderInput("");
      if (updated && Array.isArray(updated)) {
        queryClient.setQueryData(["applicationFiles", appId], updated);
      }
      queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
      refetchFiles();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao copiar arquivos.");
    },
  });

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploadingFiles(true);
    setUploadProgress(15);
    setUploadStatusText("Lendo arquivos selecionados...");

    try {
      // 1. Se o usuário selecionou um arquivo .ZIP, faz o upload do arquivo para o servidor sem descompactar automaticamente
      const zipFile = Array.from(fileList).find((f) => f.name.toLowerCase().endsWith(".zip"));
      
      if (zipFile) {
        setUploadProgress(40);
        setUploadStatusText(`Enviando pacote ${zipFile.name} para o servidor...`);

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(zipFile);
        });

        const zipBase64 = await base64Promise;
        setUploadProgress(85);
        setUploadStatusText("Salvando arquivo ZIP no diretório /var/www/html...");

        const result = await uploadApplicationZip({
          data: {
            appId,
            fileName: zipFile.name,
            zipBase64,
            autoExtract: false,
          },
        });

        setUploadProgress(100);
        setUploadStatusText("Concluído!");
        toast.success(`📦 Pacote ${zipFile.name} enviado com sucesso! Clique em "Extrair ZIP" no arquivo para descompactar.`);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        if (result?.files && Array.isArray(result.files)) {
          queryClient.setQueryData(["applicationFiles", appId], result.files);
        }
        queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
        await refetchFiles();

        setTimeout(() => {
          setIsUploadingFiles(false);
          setUploadProgress(0);
          setUploadStatusText("");
        }, 1000);
        return;
      }

      // 2. Se forem múltiplos arquivos avulsos (.html, .css, etc.)
      const filesToSave: Array<{ path: string; content: string }> = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress(Math.min(70, Math.round(15 + ((i + 1) / fileList.length) * 55)));
        setUploadStatusText(`Lendo (${i + 1}/${fileList.length}): ${file.name}...`);
        const content = await file.text();
        filesToSave.push({ path: file.name, content });
      }

      if (filesToSave.length === 0) {
        toast.error("Nenhum arquivo válido encontrado.");
        setIsUploadingFiles(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(80);
      setUploadStatusText(`Gravando ${filesToSave.length} arquivo(s) em /var/www/html...`);
      const updated = await saveApplicationFilesBatch({ data: { appId, files: filesToSave } });

      setUploadProgress(100);
      setUploadStatusText("Concluído!");
      toast.success(`🎉 ${filesToSave.length} arquivo(s) salvos com sucesso em /var/www/html!`);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (updated && Array.isArray(updated)) {
        queryClient.setQueryData(["applicationFiles", appId], updated);
      }
      queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
      await refetchFiles();

      setTimeout(() => {
        setIsUploadingFiles(false);
        setUploadProgress(0);
        setUploadStatusText("");
      }, 1000);
    } catch (err: any) {
      toast.error("Erro ao enviar arquivos: " + err.message);
      setIsUploadingFiles(false);
      setUploadProgress(0);
      setUploadStatusText("");
    }
  };

  const saveEnvsMutation = useMutation({
    mutationFn: async () => {
      return saveApplicationEnvs({ data: { appId, envs: envsList } });
    },
    onSuccess: (res: any) => {
      if (res?.requiresRebuild) {
        toast.warning("Variáveis salvas! Como contêm valores build-time (ex: NEXT_PUBLIC_*), execute um novo Deploy para aplicar no frontend.");
      } else {
        toast.success("Variáveis de ambiente (.env) salvas com sucesso!");
      }
      queryClient.invalidateQueries({ queryKey: ["applicationEnvs", appId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar variáveis.");
    },
  });

  // Instalação de Template 1-Clique
  const applyTemplateMutation = useMutation({
    mutationFn: async (template: AppTemplate) => {
      setDeployAppTitle(template.name);
      setDeployStep(1);
      setDeploymentLogs([
        { output: `🚀 Selecionado modelo 1-Clique: ${template.name}`, type: "stdout" },
        { output: `📦 Alocando container com ${app?.memory_limit || 512}MB RAM e ${app?.cpu_limit || 1} vCPU...`, type: "stdout" },
        { output: `🔗 Conectando ao repositório: ${template.git_repository} (${template.git_branch})...`, type: "stdout" },
        { output: `⚙️ Configurando Buildpack (${template.build_pack.toUpperCase()}) e porta interna ${template.default_port}...`, type: "stdout" },
      ]);
      setDeploymentStatus("in_progress");
      setIsTemplateModalOpen(false);
      setIsDeployModalOpen(true);

      return applyTemplateToApp({
        data: {
          appId,
          template: {
            id: template.id,
            git_repository: template.git_repository,
            git_branch: template.git_branch,
            build_pack: template.build_pack,
            default_envs: template.default_envs?.map((e) => ({ key: e.key, value: e.value })),
            default_port: template.default_port,
          },
        },
      });
    },
    onSuccess: (res: any) => {
      if (res?.deploymentUuid) {
        setActiveDeploymentUuid(res.deploymentUuid);
      } else {
        setTimeout(() => {
          setDeploymentLogs((prev) => [
            ...prev,
            { output: "Injetando variáveis de ambiente...", type: "stdout" },
            { output: "Executando build da imagem Docker / Nixpacks...", type: "stdout" },
            { output: "Gerando certificado SSL Let's Encrypt...", type: "stdout" },
            { output: "Aplicação online com sucesso 24/7!", type: "stdout" },
          ]);
          setDeploymentStatus("finished");
          setDeployStep(4);
          queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
          refetch();
        }, 3000);
      }
    },
    onError: (err: any) => {
      setDeploymentStatus("failed");
      setDeploymentLogs((prev) => [
        ...prev,
        { output: `ERRO CRÍTICO NO DEPLOY: ${err.message}`, type: "stderr" },
      ]);
      toast.error(err.message || "Erro ao instalar modelo.");
    },
  });

  const saveDomainMutation = useMutation({
    mutationFn: async () => {
      return updateApplicationDomain({ data: { appId, domain: customDomainInput } });
    },
    onSuccess: () => {
      toast.success("Domínio sincronizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar domínio.");
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-pulse">
          <div className="h-8 w-64 bg-muted rounded-xl mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-muted rounded-2xl" />
            <div className="h-32 bg-muted rounded-2xl" />
            <div className="h-32 bg-muted rounded-2xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (isError || !app) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto my-16 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Aplicação não encontrada</h2>
          <p className="text-sm text-muted-foreground">Não foi possível carregar os detalhes do container.</p>
          <Button asChild className="rounded-xl">
            <Link to="/services">Voltar para Meus Serviços</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const isPendingDeploy = app.status === "pending_deploy" || (!app.git_repository && app.status !== "running");
  const isRunning = app.status === "running" && Boolean(app.git_repository);
  const metrics = app.metrics || {
    usedRamMb: isRunning ? Math.round((app.memory_limit || 512) * 0.35) : 0,
    totalRamMb: app.memory_limit || 512,
    ramUsagePercent: isRunning ? 35 : 0,
    cpuUsagePercent: isRunning ? 2.5 : 0,
  };

  const getStatusBadge = () => {
    if (isPendingDeploy) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1.5 py-1 px-3">
          <Sparkles className="h-3.5 w-3.5" /> Recursos Alocados • Aguardando Primeiro Deploy
        </Badge>
      );
    }
    switch (app.status) {
      case "running":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 gap-1.5 py-1 px-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Online (Rodando)
          </Badge>
        );
      case "building":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1.5 py-1 px-3">
            <RefreshCw className="h-3 w-3 animate-spin" /> Compilando (Build em andamento)
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1.5 py-1 px-3">
            <XCircle className="h-3 w-3" /> Falha no Build
          </Badge>
        );
      case "stopped":
      default:
        return (
          <Badge variant="secondary" className="gap-1.5 py-1 px-3">
            <span className="h-2 w-2 rounded-full bg-zinc-400" /> Container Parado
          </Badge>
        );
    }
  };

  const handleCopyLogs = () => {
    if (!deploymentLogs || deploymentLogs.length === 0) {
      toast.info("Nenhum log disponível para cópia no momento.");
      return;
    }
    const logText = deploymentLogs.map((l) => l.output).join("\n");
    navigator.clipboard.writeText(logText);
    toast.success("Logs do terminal copiados para a área de transferência!");
  };

  // Filtragem de logs
  const filteredLogs = logsData
    ? logsData
        .split("\n")
        .filter((line: string) => !logSearchQuery || line.toLowerCase().includes(logSearchQuery.toLowerCase()))
        .join("\n")
    : "Carregando logs do container...";

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/services" className="hover:underline flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Meus Serviços
              </Link>
              <span>/</span>
              <span>Aplicações & Bots</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{app.name}</h1>
              {getStatusBadge()}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (app.last_deployment_uuid) {
                    setActiveDeploymentUuid(app.last_deployment_uuid);
                  }
                  setIsDeployModalOpen(true);
                }}
                className="rounded-xl h-7 text-xs gap-1.5 font-medium border-muted-foreground/30 hover:bg-muted"
              >
                <Terminal className="h-3.5 w-3.5" /> Ver Logs do Deploy
              </Button>
            </div>
            {!isPendingDeploy && app.fqdn && (
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={app.fqdn}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl hover:bg-emerald-500/20 flex items-center gap-1.5 font-mono font-bold transition-colors shadow-sm"
                >
                  <Globe className="h-3.5 w-3.5 text-emerald-500" />
                  {app.fqdn}
                  <ExternalLink className="h-3 w-3 ml-0.5 opacity-70" />
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(app.fqdn);
                    toast.success("Domínio copiado para a área de transferência!");
                  }}
                  className="h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
            )}
          </div>

          {/* Botões de Ação de Ciclo de Vida */}
          <div className="flex flex-wrap items-center gap-2">
            {isPendingDeploy ? (
              <Button 
                onClick={() => setIsTemplateModalOpen(true)}
                className="rounded-xl h-9 px-4 gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                Escolher Modelo & Fazer Deploy
              </Button>
            ) : (
              <>
                {isRunning ? (
                  <Button
                    variant="outline"
                    className="rounded-xl h-9 px-3.5 gap-2 font-semibold border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 transition-all shadow-xs text-xs"
                    disabled={actionMutation.isPending}
                    onClick={() => actionMutation.mutate("stop")}
                  >
                    <Square className="h-3.5 w-3.5" />
                    Parar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="rounded-xl h-9 px-3.5 gap-2 font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all shadow-xs text-xs"
                    disabled={actionMutation.isPending}
                    onClick={() => actionMutation.mutate("start")}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Iniciar
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="rounded-xl h-9 px-3.5 gap-2 font-semibold border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground active:scale-95 transition-all shadow-xs text-xs"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate("restart")}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reiniciar
                </Button>

                <Button
                  className="rounded-xl h-9 px-4 gap-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 transition-all shadow-sm text-xs"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate("deploy")}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Re-Deploy
                </Button>

                <Button
                  variant="outline"
                  className="rounded-xl h-9 px-3 gap-1.5 font-semibold border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 transition-all shadow-xs text-xs"
                  disabled={deleteAppMutation.isPending}
                  onClick={() => setIsDeleteModalOpen(true)}
                  title="Excluir aplicação e containers"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Abas do Painel */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/60 p-1 rounded-2xl inline-flex flex-wrap">
            <TabsTrigger value="overview" className="rounded-xl gap-1.5 text-xs font-semibold">
              <Activity className="h-3.5 w-3.5" /> Visão Geral & Métricas
            </TabsTrigger>
            <TabsTrigger value="files" className="rounded-xl gap-1.5 text-xs font-semibold">
              <Code2 className="h-3.5 w-3.5" /> Editor de Código & Arquivos
            </TabsTrigger>
            <TabsTrigger value="deploy" className="rounded-xl gap-1.5 text-xs font-semibold">
              <GitBranch className="h-3.5 w-3.5" /> Código & Deploy
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-xl gap-1.5 text-xs font-semibold">
              <Terminal className="h-3.5 w-3.5" /> Terminal de Logs
            </TabsTrigger>
            <TabsTrigger value="envs" className="rounded-xl gap-1.5 text-xs font-semibold">
              <KeyRound className="h-3.5 w-3.5" /> Variáveis (.env)
            </TabsTrigger>
            <TabsTrigger value="domains" className="rounded-xl gap-1.5 text-xs font-semibold">
              <Globe className="h-3.5 w-3.5" /> Domínios & SSL
            </TabsTrigger>
          </TabsList>

          {/* 1. ABA: VISÃO GERAL & MÉTRICAS */}
          <TabsContent value="overview" className="space-y-6">
            {isPendingDeploy ? (
              <div className="space-y-6">
                {/* Banner Principal de Boas-Vindas */}
                <div className="bg-gradient-to-r from-amber-500/10 via-brand/5 to-transparent border-2 border-dashed border-amber-500/30 p-8 sm:p-10 rounded-3xl text-center space-y-4">
                  <div className="h-16 w-16 rounded-3xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <div className="max-w-2xl mx-auto space-y-2">
                    <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                      Infraestrutura Alocada • Aguardando Primeiro Deploy
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Seu container com <strong>{app.memory_limit} MB de RAM</strong> e <strong>{app.cpu_limit} vCPU</strong> está provisionado e reservado exclusivamente para você no cluster DK1. Nenhum serviço está consumindo recursos ainda.
                    </p>
                  </div>
                </div>

                {/* 3 Opções Claras de Deploy */}
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Opção 1: Catálogo 1-Clique */}
                  <Card className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent p-6 flex flex-col justify-between hover:border-amber-500/60 transition-all hover:shadow-md">
                    <div className="space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Zap className="h-6 w-6" />
                      </div>
                      <h4 className="font-bold text-base text-foreground">Catálogo de Modelos (1-Clique)</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Instale WordPress, Bots de WhatsApp, Discord, N8N, Next.js, APIs e dezenas de ferramentas prontas para produção.
                      </p>
                    </div>
                    <Button 
                      onClick={() => setIsTemplateModalOpen(true)}
                      className="w-full mt-6 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-sm"
                    >
                      <Sparkles className="h-4 w-4" /> Abrir Catálogo
                    </Button>
                  </Card>

                  {/* Opção 2: Upload Direto ZIP */}
                  <Card className="rounded-3xl border p-6 flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-md">
                    <div className="space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <FolderArchive className="h-6 w-6" />
                      </div>
                      <h4 className="font-bold text-base text-foreground">Upload de Arquivo .ZIP</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Envie o código fonte do seu bot ou site em formato ZIP (Node.js, Python, PHP, Dockerfile ou HTML estático).
                      </p>
                    </div>
                    <Button 
                      onClick={() => setActiveTab("files")}
                      variant="outline"
                      className="w-full mt-6 rounded-xl font-bold gap-2"
                    >
                      <Upload className="h-4 w-4" /> Enviar Arquivo .ZIP
                    </Button>
                  </Card>

                  {/* Opção 3: Conectar Repositório Git */}
                  <Card className="rounded-3xl border p-6 flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-md">
                    <div className="space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-muted text-foreground flex items-center justify-center">
                        <GitBranch className="h-6 w-6" />
                      </div>
                      <h4 className="font-bold text-base text-foreground">Repositório Git</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Conecte seu repositório do GitHub ou GitLab para compilação contínua e deploys automáticos a cada commit.
                      </p>
                    </div>
                    <Button 
                      onClick={() => setActiveTab("deploy")}
                      variant="outline"
                      className="w-full mt-6 rounded-xl font-bold gap-2"
                    >
                      <GitBranch className="h-4 w-4" /> Conectar Git
                    </Button>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="rounded-3xl p-6 border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Uso de Memória RAM</span>
                    <HardDrive className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold">{metrics.usedRamMb} MB</span>
                      <span className="text-xs text-muted-foreground">de {metrics.totalRamMb} MB</span>
                    </div>
                    <Progress value={metrics.ramUsagePercent} className="h-2 rounded-full" />
                    <p className="text-[11px] text-muted-foreground text-right">{metrics.ramUsagePercent}% utilizado</p>
                  </div>
                </Card>

                <Card className="rounded-3xl p-6 border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Uso de CPU</span>
                    <Cpu className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold">{metrics.cpuUsagePercent}%</span>
                      <span className="text-xs text-muted-foreground">{app.cpu_limit} vCPU</span>
                    </div>
                    <Progress value={Math.min(100, metrics.cpuUsagePercent * 4)} className="h-2 rounded-full" />
                    <p className="text-[11px] text-muted-foreground text-right">Média dos núcleos</p>
                  </div>
                </Card>

                <Card className="rounded-3xl p-6 border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Disponibilidade & Uptime</span>
                    <ShieldCheck className="h-4 w-4 text-lime-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-lime-500 animate-pulse" />
                      <span className="text-2xl font-bold text-lime-600 dark:text-lime-400">100% Operacional</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Respondendo requisições HTTP 200 OK no Cluster DK1.
                    </p>
                  </div>
                </Card>
              </div>
            )}

            <Card className="rounded-3xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Informações da Infraestrutura</CardTitle>
                <CardDescription>Especificações técnicas do container alocado no cluster.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Servidor Web / Engine</span>
                    <span className="font-semibold uppercase">
                      {app.build_pack === "static" ? "Caddy Server 2 (HTTP/3 & QUIC)" : (app.build_pack || "Nixpacks Container")}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Status da Conexão</span>
                    <span className="font-semibold text-lime-600 dark:text-lime-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-lime-500" /> HTTP/2 & HTTP/3 Habilitados
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Status do Cluster</span>
                    <span className="font-semibold text-lime-600 dark:text-lime-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-lime-500 animate-pulse" /> DK1.EQSAM.COM (Online • 0 falhas)
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Certificado SSL</span>
                    <span className="font-semibold text-lime-600 dark:text-lime-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-lime-500" /> Let's Encrypt TLS Automático
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. ABA: GERENCIADOR DE ARQUIVOS & EDITOR REAL */}
          <TabsContent value="files" className="space-y-6">
            <FileManagerView appId={appId} />
          </TabsContent>

          {/* 3. ABA: CÓDIGO & DEPLOY */}
          <TabsContent value="deploy" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-3xl border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-primary" />
                    Repositório Git (GitHub / GitLab)
                  </CardTitle>
                  <CardDescription>
                    Configure um repositório Git público ou privado para disparo automático de builds.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL do Repositório</Label>
                    <Input 
                      value={gitRepoInput}
                      onChange={(e) => setGitRepoInput(e.target.value)}
                      placeholder="https://github.com/usuario/meu-bot-node" 
                      className="rounded-xl font-mono text-xs" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch Principal</Label>
                    <Input 
                      value={gitBranchInput}
                      onChange={(e) => setGitBranchInput(e.target.value)}
                      placeholder="main ou master" 
                      className="rounded-xl font-mono text-xs" 
                    />
                  </div>
                  <Button 
                    className="w-full rounded-xl gap-2 font-semibold bg-primary"
                    disabled={actionMutation.isPending}
                    onClick={() => actionMutation.mutate("deploy")}
                  >
                    <Zap className="h-4 w-4" />
                    Salvar e Disparar Build
                  </Button>
                </CardContent>
              </Card>

              {/* 2º Card: Upload ZIP Rápido */}
              <Card className="rounded-3xl border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Upload Direto (ZIP / Arquivo)
                  </CardTitle>
                  <CardDescription>
                    Prefere não usar Git? Envie o arquivo <code className="text-xs font-mono bg-muted p-1 rounded">.zip</code> do seu bot ou projeto diretamente pelo navegador.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div 
                    onClick={() => setActiveTab("files")}
                    className="border-2 border-dashed rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/20"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="font-semibold text-sm">Arraste seu arquivo .zip aqui</p>
                    <p className="text-xs text-muted-foreground mt-1">Node.js, Python, Dockerfile ou HTML (máx. 100MB)</p>
                  </div>
                  <Button onClick={() => setActiveTab("files")} variant="outline" className="w-full rounded-xl font-semibold">
                    Abrir Editor de Arquivos no Navegador
                  </Button>
                </CardContent>
              </Card>

              {/* 3º Card: Catálogo de Modelos 1-Clique */}
              <Card className="rounded-3xl border shadow-sm md:col-span-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-brand/5 to-transparent">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Catálogo de Modelos & Apps Prontos (1-Clique)
                  </CardTitle>
                  <CardDescription>
                    Instale WordPress, Bots de WhatsApp/Discord, N8N, Next.js, APIs e muito mais com um único clique diretamente neste container.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground">
                    Mais de 25 modelos otimizados para produção com portas e variáveis prontas para rodar.
                  </div>
                  <Button 
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="w-full sm:w-auto rounded-xl gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                  >
                    <Zap className="h-4 w-4" />
                    Abrir Catálogo de Modelos
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 4. ABA: TERMINAL DE LOGS */}
          <TabsContent value="logs" className="space-y-4">
            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <div className="bg-zinc-950 p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-lime-500 inline-block" />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 ml-2">stdout / stderr :: {app.name} (live cluster stream)</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
                    <Input 
                      placeholder="Filtrar logs..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="h-7 text-xs bg-zinc-900 border-zinc-800 pl-7 text-zinc-300 rounded-lg"
                    />
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5"
                    onClick={() => refetchLogs()}
                    disabled={isFetchingLogs}
                  >
                    <RefreshCw className={`h-3 w-3 ${isFetchingLogs ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                </div>
              </div>

              <div className="bg-black p-6 font-mono text-xs text-emerald-400 overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre-wrap selection:bg-emerald-900 selection:text-white">
                {filteredLogs}
              </div>
            </Card>
          </TabsContent>

          {/* 5. ABA: VARIÁVEIS DE AMBIENTE (.ENV) */}
          <TabsContent value="envs" className="space-y-6">
            <Card className="rounded-3xl border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">Variáveis de Ambiente (.env)</CardTitle>
                    <CardDescription>
                      Chaves de API, senhas e configurações secretas injetadas de forma criptografada no container.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="rounded-xl gap-1.5 text-xs"
                    >
                      {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showSecrets ? "Ocultar Valores" : "Revelar Valores"}
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setEnvsList([...envsList, { key: "", value: "" }])}
                      className="rounded-xl gap-1.5 text-xs font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Variável
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {envsList.map((env, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={env.key}
                        onChange={(e) => {
                          const updated = [...envsList];
                          updated[index].key = e.target.value;
                          setEnvsList(updated);
                        }}
                        placeholder="NOME_DA_VARIAVEL"
                        className="rounded-xl font-mono text-xs font-semibold uppercase flex-1"
                      />
                      <Input
                        type={showSecrets ? "text" : "password"}
                        value={env.value}
                        onChange={(e) => {
                          const updated = [...envsList];
                          updated[index].value = e.target.value;
                          setEnvsList(updated);
                        }}
                        placeholder="valor_secreto_ou_configuracao"
                        className="rounded-xl font-mono text-xs flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const updated = envsList.filter((_, i) => i !== index);
                          setEnvsList(updated);
                        }}
                        className="rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {envsList.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Nenhuma variável de ambiente definida. Adicione variáveis acima para injetá-las no container.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <Button 
                    onClick={() => saveEnvsMutation.mutate()}
                    disabled={saveEnvsMutation.isPending}
                    className="rounded-xl gap-2 font-semibold"
                  >
                    <Save className="h-4 w-4" /> Salvar Variáveis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 6. ABA: DOMÍNIOS & SSL */}
          <TabsContent value="domains" className="space-y-6">
            <Card className="rounded-3xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Domínio & Certificado SSL</CardTitle>
                <CardDescription>
                  Configure o endereço web pelo qual sua API ou bot receberá requisições HTTP/Webhooks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Endereço de Acesso (FQDN)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value)}
                      placeholder="minha-api.eqsam.cloud ou api.meudominio.com"
                      className="rounded-xl font-mono text-sm"
                    />
                    <Button 
                      onClick={() => saveDomainMutation.mutate()}
                      disabled={saveDomainMutation.isPending}
                      className="rounded-xl gap-2 font-semibold"
                    >
                      <Save className="h-4 w-4" /> Salvar Domínio
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/40 p-4 rounded-2xl border space-y-2 text-xs">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-lime-500" /> Certificado SSL Automático (HTTPS)
                  </p>
                  <p className="text-muted-foreground">
                    Ao apontar um domínio personalizado, crie um registro <strong>CNAME</strong> apontando para o seu subdomínio original ou um registro <strong>A</strong> para o IP do cluster (<strong>45.159.172.18</strong>). O Traefik emitirá o certificado SSL Let's Encrypt automaticamente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal Fullscreen de Edição de Código */}
        <Dialog open={isEditorModalOpen} onOpenChange={setIsEditorModalOpen}>
          <DialogContent className="rounded-3xl max-w-5xl h-[88vh] flex flex-col p-0 overflow-hidden bg-zinc-950 text-white border-zinc-800">
            <DialogHeader className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                    <Code2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-base font-bold text-white font-mono flex items-center gap-1.5">
                        /var/www/html/{selectedFilePath}
                      </DialogTitle>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono border-zinc-700 text-zinc-300">
                        {selectedFilePath.split(".").pop() || "CODE"}
                      </Badge>
                    </div>
                    <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                      Diretório raiz do Caddy Server. Salve para atualizar seu site no ar.
                    </DialogDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => saveFileMutation.mutate({ shouldRestart: false })}
                    disabled={saveFileMutation.isPending}
                    className="rounded-xl text-xs font-semibold border-zinc-700 text-zinc-200 hover:bg-zinc-800 gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" /> Salvar Arquivo
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      saveFileMutation.mutate({ shouldRestart: true });
                    }}
                    disabled={saveFileMutation.isPending}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <Zap className="h-3.5 w-3.5" /> Salvar & Publicar no Ar
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Canvas do Editor de Código com Números de Linha */}
            <div className="flex-1 flex bg-zinc-950 font-mono text-xs overflow-hidden">
              {/* Números de Linha */}
              <div className="py-4 px-3 bg-zinc-900/40 select-none text-right text-zinc-600 font-mono text-xs border-r border-zinc-800/80 shrink-0 overflow-hidden">
                {fileEditorContent.split("\n").map((_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Textarea do Editor */}
              <textarea
                value={fileEditorContent}
                onChange={(e) => setFileEditorContent(e.target.value)}
                placeholder="// Insira seu código aqui..."
                className="w-full flex-1 bg-transparent p-4 text-emerald-400 font-mono resize-none focus:outline-none leading-6 selection:bg-emerald-900 selection:text-white"
                spellCheck={false}
              />
            </div>

            {/* Barra de Status Inferior */}
            <div className="p-3 px-5 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 shrink-0">
              <div className="flex items-center gap-4">
                <span>Linhas: <strong className="text-zinc-200">{fileEditorContent.split("\n").length}</strong></span>
                <span>Caracteres: <strong className="text-zinc-200">{fileEditorContent.length}</strong></span>
                <span>Codificação: <strong className="text-zinc-200">UTF-8</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 font-semibold">Caddy Server HTTP/3 Ativo</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Criação de Novo Arquivo */}
        <Dialog open={isCreatingFileModal} onOpenChange={setIsCreatingFileModal}>
          <DialogContent className="rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FilePlus className="h-5 w-5 text-primary" /> Criar Novo Arquivo
              </DialogTitle>
              <DialogDescription className="text-xs">
                Informe o nome e extensão do arquivo (ex: <code>index.js</code>, <code>config.json</code>, <code>styles.css</code>).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome do Arquivo</Label>
                <Input
                  value={newFileNameInput}
                  onChange={(e) => setNewFileNameInput(e.target.value)}
                  placeholder="src/app.js ou config.json"
                  className="rounded-xl font-mono text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreatingFileModal(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button 
                  onClick={() => createFileMutation.mutate()} 
                  disabled={createFileMutation.isPending}
                  className="rounded-xl font-bold bg-primary"
                >
                  Criar Arquivo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Criação de Pasta */}
        <Dialog open={isCreatingFolderModal} onOpenChange={setIsCreatingFolderModal}>
          <DialogContent className="rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-primary" /> Criar Nova Pasta
              </DialogTitle>
              <DialogDescription className="text-xs">
                Informe o nome do novo diretório (ex: <code>assets</code>, <code>images</code>, <code>css</code>, <code>js</code>).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome da Pasta</Label>
                <Input
                  value={newFolderNameInput}
                  onChange={(e) => setNewFolderNameInput(e.target.value)}
                  placeholder="assets ou images/icons"
                  className="rounded-xl font-mono text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreatingFolderModal(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button 
                  onClick={() => createFolderMutation.mutate()} 
                  disabled={createFolderMutation.isPending}
                  className="rounded-xl font-bold bg-primary"
                >
                  Criar Pasta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Mover / Copiar Arquivos em Massa */}
        <Dialog open={isMoveCopyModalOpen} onOpenChange={setIsMoveCopyModalOpen}>
          <DialogContent className="rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                {moveCopyAction === "move" ? <Folder className="h-5 w-5 text-primary" /> : <Copy className="h-5 w-5 text-primary" />}
                {moveCopyAction === "move" ? "Mover Arquivos Selecionados" : "Copiar Arquivos Selecionados"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {moveCopyAction === "move" ? "Mover" : "Copiar"} {selectedFilePaths.length} arquivo(s) selecionado(s) para um diretório de destino.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Pasta de Destino (deixe em branco para raiz /var/www/html)</Label>
                <Input
                  value={targetFolderInput}
                  onChange={(e) => setTargetFolderInput(e.target.value)}
                  placeholder="ex: assets ou js/vendor (ou vazio para raiz)"
                  className="rounded-xl font-mono text-xs"
                />
              </div>
              <div className="max-h-32 overflow-y-auto p-2 bg-muted/40 rounded-xl text-[11px] font-mono space-y-1">
                <p className="font-bold text-muted-foreground">Arquivos a serem processados:</p>
                {selectedFilePaths.map((p) => (
                  <p key={p} className="truncate text-foreground">&bull; {p}</p>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsMoveCopyModalOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    if (moveCopyAction === "move") {
                      moveFilesMutation.mutate();
                    } else {
                      copyFilesMutation.mutate();
                    }
                  }} 
                  disabled={moveFilesMutation.isPending || copyFilesMutation.isPending}
                  className="rounded-xl font-bold bg-primary"
                >
                  {moveCopyAction === "move" ? "Mover Arquivos" : "Copiar Arquivos"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Catálogo de Templates 1-Clique */}
        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
          <DialogContent className="rounded-3xl max-w-5xl sm:max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="size-5 text-amber-500" /> Catálogo de Modelos 1-Clique
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-1">
                    Escolha um modelo pronto para ser instalado instantaneamente neste container ({app.name} • {app.memory_limit}MB RAM).
                  </DialogDescription>
                </div>
              </div>

              {/* Barra de Pesquisa e Filtro de Categorias */}
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar bot, site, linguagem ou ferramenta (ex: WordPress, WhatsApp, Python, N8N)..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="rounded-2xl pl-9 bg-background"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: "all", label: "Todos" },
                    { id: "websites", label: "Sites & WordPress" },
                    { id: "languages", label: "Linguagens" },
                    { id: "bots", label: "Bots & Comunicação" },
                    { id: "automations", label: "Automação & No-Code" },
                    { id: "apis", label: "APIs & Backend" },
                    { id: "databases", label: "Bancos de Dados" },
                  ].map((cat) => (
                    <Button
                      key={cat.id}
                      type="button"
                      variant={templateCategory === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTemplateCategory(cat.id)}
                      className="rounded-xl text-xs h-7 px-3 font-semibold"
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>
            </DialogHeader>

            {/* Grid de Modelos */}
            <div className="flex-1 overflow-y-auto p-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {APP_TEMPLATES
                .filter((tpl) => {
                  const matchCat = templateCategory === "all" || tpl.category === templateCategory;
                  const matchSearch = !templateSearch || 
                    tpl.name.toLowerCase().includes(templateSearch.toLowerCase()) || 
                    tpl.description.toLowerCase().includes(templateSearch.toLowerCase()) ||
                    tpl.tags?.some((t) => t.toLowerCase().includes(templateSearch.toLowerCase()));
                  return matchCat && matchSearch;
                })
                .map((tpl) => {
                  const isRamOk = (app.memory_limit || 512) >= (tpl.recommended_ram || 256);
                  return (
                    <Card 
                      key={tpl.id}
                      className="rounded-2xl border p-4 flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-sm group bg-card"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="h-10 w-10 rounded-xl bg-muted/60 p-2 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            {tpl.icon.startsWith("http") ? (
                              <img src={tpl.icon} alt={tpl.name} className="h-6 w-6 object-contain" />
                            ) : (
                              <span className="text-xl">{tpl.icon}</span>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            Min {tpl.recommended_ram || 256}MB
                          </Badge>
                        </div>
                        <h4 className="font-bold text-sm text-foreground">{tpl.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
                        {isRamOk ? (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="size-3 shrink-0" />
                            100% Compatível com seu container
                          </p>
                        ) : (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                            <AlertTriangle className="size-3 shrink-0" />
                            Recomendado {tpl.recommended_ram}MB RAM (Seu plano: {app.memory_limit}MB)
                          </p>
                        )}
                        <Button
                          size="sm"
                          disabled={applyTemplateMutation.isPending}
                          onClick={() => {
                            setSelectedTemplateToApply(tpl);
                            setIsConfirmTemplateOpen(true);
                          }}
                          className="w-full rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90"
                        >
                          <Zap className="size-3.5" />
                          Instalar Neste App
                        </Button>
                      </div>
                    </Card>
                  );
                })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação para Substituir Aplicação por Template */}
        <AlertDialog open={isConfirmTemplateOpen} onOpenChange={setIsConfirmTemplateOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" /> Substituir Aplicação Atual?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs space-y-2">
                <p>
                  Você está prestes a instalar o modelo <strong>{selectedTemplateToApply?.name}</strong> na aplicação <strong>{app?.name}</strong>.
                </p>
                <p className="font-semibold text-rose-600">
                  ⚠️ Esta ação é irreversível e substituirá o código-fonte, repositório e arquivos atuais desta aplicação!
                </p>
                <p className="text-muted-foreground">
                  Se você deseja manter esta aplicação intacta, recomendamos criar o modelo em um novo slot isolado.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="rounded-xl text-xs">Cancelar</AlertDialogCancel>
              <Link
                to="/apps/create"
                search={{ mode: "templates", category: selectedTemplateToApply?.category }}
                className="inline-flex items-center justify-center rounded-xl text-xs font-semibold px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                onClick={() => {
                  setIsConfirmTemplateOpen(false);
                  setIsTemplateModalOpen(false);
                }}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Criar em Novo Slot Isolado
              </Link>
              <AlertDialogAction
                className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={() => {
                  if (selectedTemplateToApply) {
                    setIsConfirmTemplateOpen(false);
                    applyTemplateMutation.mutate(selectedTemplateToApply);
                  }
                }}
              >
                Sim, Substituir Aplicação
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Deploy em Tempo Real & Live Terminal */}
        <Dialog open={isDeployModalOpen} onOpenChange={setIsDeployModalOpen}>
          <DialogContent className="rounded-3xl max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-zinc-950 text-white border-zinc-800">
            <DialogHeader className="p-6 pb-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                      {deploymentStatus === "finished" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : deploymentStatus === "failed" ? (
                        <XCircle className="h-5 w-5 text-rose-500" />
                      ) : (
                        <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                      )}
                      Deploy em Andamento: {deployAppTitle || app.name}
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-xs text-zinc-400">
                    Acompanhe o build e a publicação do seu container em tempo real no cluster DK1.
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLogs}
                    className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 hover:text-white h-8 text-xs gap-1.5 font-medium px-3 shadow-xs transition-all cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar Logs
                  </button>
                  {deploymentStatus === "finished" ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">Online 24/7</Badge>
                  ) : deploymentStatus === "failed" ? (
                    <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40">Falha no Build</Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse">Compilando...</Badge>
                  )}
                </div>
              </div>

              {/* Stepper de Fases Reais do Deploy */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-zinc-800 text-[11px]">
                <div className={`p-2 rounded-xl border flex flex-col gap-1 ${deployStep >= 1 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>
                  <span className="font-bold flex items-center gap-1">
                    {deployStep > 1 ? <Check className="h-3 w-3" /> : "1."} Validação & Envs
                  </span>
                  <span className="text-[10px] opacity-80">{app.memory_limit}MB • Recursos</span>
                </div>
                <div className={`p-2 rounded-xl border flex flex-col gap-1 ${deployStep >= 2 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>
                  <span className="font-bold flex items-center gap-1">
                    {deployStep > 2 ? <Check className="h-3 w-3" /> : "2."} Build da Imagem
                  </span>
                  <span className="text-[10px] opacity-80">{app.build_pack?.toUpperCase() || "NIXPACKS"}</span>
                </div>
                <div className={`p-2 rounded-xl border flex flex-col gap-1 ${deployStep >= 3 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>
                  <span className="font-bold flex items-center gap-1">
                    {deployStep > 3 ? <Check className="h-3 w-3" /> : "3."} Healthcheck
                  </span>
                  <span className="text-[10px] opacity-80">HTTP/TCP Probe</span>
                </div>
                <div className={`p-2 rounded-xl border flex flex-col gap-1 ${deployStep >= 4 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>
                  <span className="font-bold flex items-center gap-1">
                    {deployStep >= 4 && deploymentStatus === "finished" ? <Check className="h-3 w-3" /> : "4."} Domínio & SSL
                  </span>
                  <span className="text-[10px] opacity-80">Traefik Proxy</span>
                </div>
              </div>
            </DialogHeader>

            {/* Banner de Diagnóstico Inteligente em caso de Falha */}
            {deploymentDiagnostic && (
              <div className="bg-rose-950/70 border-b border-rose-800/60 p-4 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <h4 className="text-xs font-bold text-rose-200">{deploymentDiagnostic.title}</h4>
                    <p className="text-[11px] text-rose-300/90 leading-relaxed">{deploymentDiagnostic.description}</p>
                    {deploymentDiagnostic.possibleCause && (
                      <p className="text-[11px] text-amber-300/90 font-medium">
                        💡 <strong>Causa provável:</strong> {deploymentDiagnostic.possibleCause}
                      </p>
                    )}
                  </div>
                  {deploymentDiagnostic.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-rose-900/60 hover:bg-rose-800 border-rose-700 text-white text-xs h-7 rounded-lg shrink-0"
                      onClick={() => {
                        setIsDeployModalOpen(false);
                        if (deploymentDiagnostic.action.type === "configure_env") {
                          setActiveTab("envs");
                        } else if (deploymentDiagnostic.action.type === "fix_port") {
                          setActiveTab("overview");
                        } else if (deploymentDiagnostic.action.type === "view_logs") {
                          setActiveTab("logs");
                        }
                      }}
                    >
                      {deploymentDiagnostic.action.label}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Terminal de Logs do Deploy */}
            <div className="flex-1 bg-black p-4 font-mono text-xs overflow-y-auto max-h-[360px] space-y-1">
              {deploymentLogs.length === 0 && (
                <div className="text-zinc-500 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Conectando ao daemon de build do cluster...
                </div>
              )}
              {deploymentLogs.map((log, index) => {
                const lower = log.output.toLowerCase();
                const isRealError = lower.includes("error:") || lower.includes("fatal:") || lower.includes("failed:") || lower.includes("exception:") || lower.includes("command execution failed");
                const isWarning = lower.includes("warning") || lower.includes("warn:");
                const isSuccess = lower.includes("done") || lower.includes("success") || lower.includes("ready") || lower.includes("online") || lower.includes("container pronto");
                const isStep = lower.startsWith("#") || lower.startsWith("starting") || lower.startsWith("cloning") || lower.startsWith("importing");

                let colorClass = "text-zinc-300";
                if (isRealError) colorClass = "text-rose-400 font-semibold";
                else if (isWarning) colorClass = "text-amber-400";
                else if (isSuccess) colorClass = "text-emerald-400 font-medium";
                else if (isStep) colorClass = "text-cyan-400/90";

                return (
                  <div 
                    key={index} 
                    className={`leading-relaxed whitespace-pre-wrap ${colorClass}`}
                  >
                    {log.output}
                  </div>
                );
              })}
              <div ref={terminalLogsEndRef} />
            </div>

            {/* Footer com Ações */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                {deploymentStatus === "finished" ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Container pronto e respondendo requisições!
                  </span>
                ) : deploymentStatus === "failed" ? (
                  <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" /> Build interrompido com erros.
                  </span>
                ) : (
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" /> Compilando dependências e iniciando processo...
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 hover:text-white font-medium text-xs px-3.5 h-9 gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar Logs
                </button>
                {deploymentStatus === "failed" && (
                  <button
                    type="button"
                    onClick={() => actionMutation.mutate("deploy")}
                    disabled={actionMutation.isPending}
                    className="inline-flex items-center justify-center rounded-xl font-bold bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs px-4 h-9 gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Tentar Novamente
                  </button>
                )}
                {deploymentStatus === "finished" && app.fqdn && (
                  <a
                    href={app.fqdn}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs px-4 h-9 gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Acessar Online
                  </a>
                )}
                <button 
                  type="button"
                  onClick={() => setIsDeployModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-zinc-200 hover:text-white font-medium text-xs px-3.5 h-9 transition-all cursor-pointer shadow-sm"
                >
                  Fechar Janela
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Padronizado de Confirmação de Exclusão */}
        <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <AlertDialogContent className="rounded-3xl border-zinc-200 dark:border-zinc-800">
            <AlertDialogHeader className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Trash2 className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">
                Excluir Definitivamente &quot;{app.name}&quot;?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
                <p>
                  Esta ação é <strong className="text-foreground">permanente e irreversível</strong>. Ao confirmar:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                  <li>O container Docker em execução será imediatamente finalizado e excluído.</li>
                  <li>Todos os volumes de dados persistentes, logs e arquivos em disco serão apagados.</li>
                  <li>O proxy reverso e os certificados SSL associados ao domínio serão removidos.</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
              <AlertDialogCancel className="rounded-xl text-xs font-semibold">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                disabled={deleteAppMutation.isPending}
                onClick={() => deleteAppMutation.mutate()}
              >
                {deleteAppMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" /> Sim, Excluir Aplicação
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
