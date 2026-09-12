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
  Folder,
  Lock,
  Server,
  Database,
  Info,
  HelpCircle,
  ArrowRight,
  Wifi,
  CheckCircle,
  Pencil,
  X
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
  executeAppAction,
  triggerApplicationAction,
  getApplicationLogs, 
  getApplicationEnvs, 
  saveApplicationEnvs,
  updateApplicationDomain,
  resetApplicationDomain,
  verifyApplicationDomainDns,
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
  updateApplicationName,
  deployApplicationFromGit,
  resetCloudApp
} from "@/lib/cloud-apps.functions";
import { getMyDomains } from "@/lib/domains.functions";
import { APP_TEMPLATES, type AppTemplate, getRequiredDiskWithMargin } from "@/lib/templates.data";
import { toast } from "sonner";
import { FileManagerView } from "@/components/file-manager/FileManagerView";
import { UptimeMonitoringSection } from "@/components/apps/UptimeMonitoringSection";
import { ContainerLogsViewer } from "@/components/apps/ContainerLogsViewer";
import { generateAppDefaultFqdn, extractAppHash12, calculateDatabasePort } from "@/lib/app-subdomain";

export const Route = createFileRoute("/_authenticated/apps/$appId")({
  head: () => ({
    meta: [{ title: "Gerenciar Aplicação — Eqsam PaaS" }],
  }),
  component: AppDetailsPage,
});

function detectPendingRequiredEnvs(envs?: Array<{ key: string; value: string }>) {
  if (!envs || !Array.isArray(envs)) return [];
  const placeholderTokens = [
    "re_insira_",
    "insira_",
    "seu_",
    "sua_",
    "coloque_",
    "change_me",
    "placeholder",
    "your_",
    "insert_",
    "replace_",
    "eqsam_wp_pass",
    "eqsam-auth-secret",
    "eqsam-cron",
    "eqsam_api_secret",
  ];
  return envs.filter((e) => {
    const val = (e.value || "").trim().toLowerCase();
    if (!val && (e.key.includes("KEY") || e.key.includes("TOKEN") || e.key.includes("SECRET") || e.key.includes("PASSWORD"))) return true;
    return placeholderTokens.some((token) => val.includes(token));
  });
}

function AppDetailsPage() {
  const { appId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [isStopAppConfirmOpen, setIsStopAppConfirmOpen] = useState(false);
  const [isGitDeployConfirmOpen, setIsGitDeployConfirmOpen] = useState(false);

  // Estados de formulários
  const [gitRepoInput, setGitRepoInput] = useState("");
  const [gitBranchInput, setGitBranchInput] = useState("main");
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [envsList, setEnvsList] = useState<Array<{ key: string; value: string; is_build_time?: boolean | undefined }>>([]);
  const [showSecrets, setShowSecrets] = useState(false);
  const [visibleSecretsMap, setVisibleSecretsMap] = useState<Record<number, boolean>>({});
  const isRowSecretVisible = (index: number) => {
    if (visibleSecretsMap[index] !== undefined) {
      return visibleSecretsMap[index];
    }
    return showSecrets;
  };
  const toggleRowSecret = (index: number) => {
    setVisibleSecretsMap((prev) => ({
      ...prev,
      [index]: !isRowSecretVisible(index),
    }));
  };
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

  // Estados para o Modal de Deploy ao Vivo (Live Terminal & Status)
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [activeDeploymentUuid, setActiveDeploymentUuid] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<"queued" | "in_progress" | "finished" | "failed" | null>(null);
  const [deploymentLogs, setDeploymentLogs] = useState<Array<{ output: string; type: string }>>([]);
  const [deployStep, setDeployStep] = useState<number>(1);
  const [deployAppTitle, setDeployAppTitle] = useState<string>("");
  const terminalLogsEndRef = useRef<HTMLDivElement>(null);

  // Estado para Edição do Nome da Aplicação
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameInput, setEditingNameInput] = useState("");

  // Consulta de detalhes da aplicação (polling inteligente e relaxado)
  const { data: app, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["applicationDetails", appId],
    queryFn: () => getApplicationDetails({ data: { appId } }),
    refetchInterval: activeTab === "overview" ? 12000 : 30000,
  });

  useEffect(() => {
    if (app?.name && !isEditingName) {
      setEditingNameInput(app.name);
    }
  }, [app?.name, isEditingName]);

  const appRoot = (app?.container_root || "/var/www/html").replace(/\/+$/, "");

  // Consulta de logs em tempo real (atualização apenas quando a aba de logs ou terminal estiver ativa)
  const { data: logsData, isFetching: isFetchingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["applicationLogs", appId],
    queryFn: () => getApplicationLogs({ data: { appId } }),
    enabled: Boolean(appId) && (activeTab === "logs" || activeTab === "terminal"),
    refetchInterval: (activeTab === "logs" || activeTab === "terminal") ? 5000 : false,
  });

  // Consulta de variáveis de ambiente (carregadas sob demanda apenas nas abas relevantes)
  const { data: envsData } = useQuery({
    queryKey: ["applicationEnvs", appId],
    queryFn: () => getApplicationEnvs({ data: { appId } }),
    enabled: Boolean(appId) && (activeTab === "envs" || activeTab === "settings"),
  });

  // Consulta de arquivos do container para o Editor Web (carregamento sob demanda)
  const { data: filesData, refetch: refetchFiles } = useQuery({
    queryKey: ["applicationFiles", appId],
    queryFn: () => getApplicationFiles({ data: { appId } }),
    enabled: Boolean(appId) && activeTab === "files",
  });

  // Consulta de domínios registrados na conta do cliente
  const { data: userDomains } = useQuery({
    queryKey: ["userDomains"],
    queryFn: () => getMyDomains(),
    staleTime: 60000,
  });

  // Estados e helpers para Domínio & DNS
  const [dnsCheckResult, setDnsCheckResult] = useState<{
    success: boolean;
    isConfigured: boolean;
    cleanDomain?: string;
    targetClusterIp?: string;
    aRecords?: string[];
    cnameRecords?: string[];
    status?: string;
    message: string;
  } | null>(null);
  const [isVerifyingDns, setIsVerifyingDns] = useState(false);
  const [copiedDnsKey, setCopiedDnsKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedDnsKey(key);
      setTimeout(() => setCopiedDnsKey(null), 2000);
    }
    toast.success("Copiado para a área de transferência!");
  };

  // Identificação do Subdomínio Padrão vs Domínio Personalizado
  const defaultSubdomain = (app as any)?.default_subdomain || 
    (app?.fqdn && !app.fqdn.includes("/app-") && (app.fqdn.includes(".dk1.eqsam.com") || app.fqdn.includes(".eqsam.cloud"))
      ? app.fqdn
      : (app ? generateAppDefaultFqdn(app) : "https://app-000000000000.dk1.eqsam.com"));

  const cleanDefaultSubdomainHost = defaultSubdomain
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  const safeOnlineUrl = app?.fqdn?.startsWith("http://") && (app.fqdn.includes(".dk1.eqsam.com") || app.fqdn.includes(".eqsam.cloud"))
    ? app.fqdn.replace(/^http:\/\//i, "https://")
    : (app?.fqdn || `https://${cleanDefaultSubdomainHost}`);

  const hasCustomDomain = Boolean(
    (app as any)?.custom_domain ||
    (app?.fqdn && !app.fqdn.includes(".dk1.eqsam.com") && !app.fqdn.includes(".eqsam.cloud"))
  );

  const activeCustomDomain = (app as any)?.custom_domain || 
    (hasCustomDomain ? app?.fqdn?.replace(/^https?:\/\//i, "").replace(/\/+$/, "") : "");

  // Sincronizar inputs com os dados carregados
  useEffect(() => {
    if (app) {
      if (app.git_repository) setGitRepoInput(app.git_repository);
      if (app.git_branch) setGitBranchInput(app.git_branch);
      const isDefault = app.fqdn?.includes(".dk1.eqsam.com") || app.fqdn?.includes(".eqsam.cloud");
      if ((app as any).custom_domain) {
        setCustomDomainInput((app as any).custom_domain);
      } else if (!isDefault && app.fqdn) {
        setCustomDomainInput(app.fqdn.replace(/^https?:\/\//i, "").replace(/\/+$/, ""));
      } else {
        setCustomDomainInput("");
      }
    }
  }, [app]);

  useEffect(() => {
    if (envsData) {
      setEnvsList(envsData);
    }
  }, [envsData]);

  // Detecção de variáveis com valores de exemplo pendentes de configuração
  const currentEnvs = envsList.length > 0 ? envsList : (envsData || (app as any)?.env_vars || []);
  const pendingEnvs = detectPendingRequiredEnvs(currentEnvs);
  const isEnvPending = (env: { key: string; value: string }) => detectPendingRequiredEnvs([env]).length > 0;

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
          if (res.logs && Array.isArray(res.logs) && res.logs.length > 0) {
            setDeploymentLogs(res.logs);
          }

          if ((res as any).step) {
            setDeployStep((res as any).step);
          } else if (res.status === "in_progress") {
            setDeployStep(3);
          }

          if (res.status === "finished") {
            setDeployStep(4);
            toast.success("Aplicação compilada e online 24/7!");
            queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
            queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
            queryClient.invalidateQueries({ queryKey: ["myApplications"] });
            refetch();
            refetchLogs();
            refetchFiles();
          } else if (res.status === "failed") {
            toast.error("Falha no build. Verifique os logs no terminal.");
          }
        }
      } catch (e) {
        console.warn("Erro ao consultar status de deployment:", e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isDeployModalOpen, activeDeploymentUuid, deploymentStatus, appId, queryClient, refetch, refetchLogs, refetchFiles]);

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
      if (action === "deploy") {
        if (res?.deploymentUuid) {
          setActiveDeploymentUuid(res.deploymentUuid);
        } else {
          setTimeout(() => {
            setDeploymentLogs((prev) => [
              ...prev,
              { output: "Sincronizando volumes e containers...", type: "stdout" },
              { output: "Verificando roteamento Traefik e certificado SSL...", type: "stdout" },
              { output: "Container pronto e respondendo requisições!", type: "stdout" },
            ]);
            setDeploymentStatus("finished");
            setDeployStep(4);
            queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
            refetch();
          }, 2500);
        }
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

  const resetMutation = useMutation({
    mutationFn: async () => {
      return resetCloudApp({ data: { appId } });
    },
    onSuccess: () => {
      toast.success("Container resetado e retornado ao estado inicial com sucesso!");
      setIsStopAppConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      refetch();
      refetchFiles();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao resetar container.");
    },
  });

  // Mutation dedicada para Deploy a partir do Git / GitHub (com reset do container)
  const deployGitMutation = useMutation({
    mutationFn: async ({ gitRepository, gitBranch }: { gitRepository: string; gitBranch?: string }) => {
      const cleanBranch = (gitBranch || "main").trim();
      const cleanRepo = gitRepository.trim();
      const targetName = cleanRepo.split("/").pop()?.replace(/\.git$/i, "") || app?.name || "Repositório Git";

      setDeployAppTitle(targetName);
      setDeployStep(1);
      setDeploymentLogs([
        { output: `[1/6] Conectando ao repositório Git: ${cleanRepo} (branch: ${cleanBranch})...`, type: "stdout" },
        { output: `Alocando recursos dedicados (${app?.memory_limit || 512}MB RAM, ${app?.cpu_limit || 1} vCPU)...`, type: "stdout" },
      ]);
      setDeploymentStatus("in_progress");
      setIsDeployModalOpen(true);

      return deployApplicationFromGit({
        data: {
          appId,
          gitRepository: cleanRepo,
          gitBranch: cleanBranch,
          resetContainer: true,
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
            { output: "Sincronizando arquivos no host do Swarm...", type: "stdout" },
            { output: "Iniciando container no Docker Swarm...", type: "stdout" },
            { output: "Configurando proxy Traefik e certificado SSL...", type: "stdout" },
            { output: "✅ Container pronto e respondendo requisições!", type: "stdout" },
          ]);
          setDeploymentStatus("finished");
          setDeployStep(4);
          queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
          queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
          queryClient.invalidateQueries({ queryKey: ["myApplications"] });
          refetch();
          refetchFiles();
        }, 3000);
      }
      toast.success("Deploy do repositório Git realizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      queryClient.invalidateQueries({ queryKey: ["applicationFiles", appId] });
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      refetch();
      refetchFiles();
    },
    onError: (err: any) => {
      setDeploymentStatus("failed");
      setDeploymentLogs((prev) => [
        ...prev,
        { output: `FALHA NO DEPLOY DO GIT: ${err.message}`, type: "stderr" },
      ]);
      toast.error(err.message || "Erro ao realizar deploy do Git.");
    },
  });

  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const clean = newName.trim();
      if (!clean) throw new Error("O nome da aplicação não pode ficar em branco.");
      return updateApplicationName({ data: { appId, name: clean } });
    },
    onSuccess: () => {
      toast.success("Nome da aplicação atualizado com sucesso!");
      setIsEditingName(false);
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar nome da aplicação.");
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
        setUploadStatusText(`Salvando arquivo ZIP no diretório ${appRoot}...`);

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
        if (!file) continue;
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
      setUploadStatusText(`Gravando ${filesToSave.length} arquivo(s) em ${appRoot}...`);
      const updated = await saveApplicationFilesBatch({ data: { appId, files: filesToSave } });

      setUploadProgress(100);
      setUploadStatusText("Concluído!");
      toast.success(`🎉 ${filesToSave.length} arquivo(s) salvos com sucesso em ${appRoot}!`);

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
    mutationFn: async ({ shouldRestart }: { shouldRestart?: boolean } = {}) => {
      await saveApplicationEnvs({ data: { appId, envs: envsList } });
      if (shouldRestart) {
        await executeAppAction({ data: { appId, action: "restart" } });
      }
      return { shouldRestart };
    },
    onSuccess: (res) => {
      if (res?.shouldRestart) {
        toast.success("🎉 Variáveis salvas e aplicação reiniciada com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
        refetch();
      } else {
        toast.success("Variáveis salvas! Reinicie ou faça Re-Deploy da aplicação para carregá-las.", {
          duration: 7000,
          action: {
            label: "Reiniciar Agora",
            onClick: () => actionMutation.mutate("restart"),
          },
        });
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
      const appDisk = (app as any)?.service?.products?.disk_quota_mb || app?.disk_limit_mb || 1536;
      const requiredDisk = getRequiredDiskWithMargin(template.recommended_disk);

      if (appDisk < requiredDisk) {
        throw new Error(`Plano incompatível com armazenamento: seu plano possui ${appDisk} MB de disco, mas o modelo "${template.name}" exige no mínimo ${template.recommended_disk} MB (+ 20% de margem de segurança para operação = ${requiredDisk} MB). Faça upgrade do seu plano para continuar.`);
      }

      if (app?.memory_limit && app.memory_limit < template.recommended_ram) {
        throw new Error(`Plano incompatível com memória: seu plano possui ${app.memory_limit} MB de RAM, mas o modelo "${template.name}" exige no mínimo ${template.recommended_ram} MB de RAM. Faça upgrade do seu plano.`);
      }

      if (app?.cpu_limit && template.recommended_cpu && app.cpu_limit < template.recommended_cpu) {
        throw new Error(`Plano incompatível com processamento: seu plano possui ${app.cpu_limit} vCPU, mas o modelo "${template.name}" exige no mínimo ${template.recommended_cpu} vCPU. Faça upgrade do seu plano.`);
      }

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
            name: template.name,
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
    mutationFn: async (domainParam?: string) => {
      const rawDomain = (typeof domainParam === "string" ? domainParam : customDomainInput)
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "")
        .trim();

      if (!rawDomain || rawDomain.length < 3) {
        throw new Error("Por favor informe um domínio válido (ex: meusite.com.br ou app.meusite.com).");
      }
      return updateApplicationDomain({ data: { appId, domain: rawDomain } });
    },
    onSuccess: () => {
      toast.success("Domínio personalizado conectado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar domínio.");
    },
  });

  const resetDomainMutation = useMutation({
    mutationFn: async () => {
      return resetApplicationDomain({ data: { appId } });
    },
    onSuccess: () => {
      toast.success("Subdomínio padrão restaurado!");
      setCustomDomainInput("");
      setDnsCheckResult(null);
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao redefinir domínio.");
    },
  });

  const verifyDnsMutation = useMutation({
    mutationFn: async (domainParam?: string) => {
      const targetDomain = (typeof domainParam === "string" ? domainParam : customDomainInput || activeCustomDomain)
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "")
        .trim();

      if (!targetDomain) throw new Error("Informe ou selecione um domínio para verificar.");
      setIsVerifyingDns(true);
      return verifyApplicationDomainDns({ data: { domain: targetDomain } });
    },
    onSuccess: (res) => {
      setIsVerifyingDns(false);
      setDnsCheckResult(res);
      if (res.isConfigured) {
        toast.success("Apontamento DNS detectado com sucesso!");
      } else {
        toast.info(res.message);
      }
    },
    onError: (err: any) => {
      setIsVerifyingDns(false);
      toast.error(err.message || "Erro ao consultar DNS.");
    },
  });

  if (isLoading) {
    return (
      <AppShell breadcrumb="Carregando Aplicação...">
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
      <AppShell breadcrumb="Aplicação não encontrada">
        <div className="max-w-md mx-auto my-16 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Aplicação não encontrada</h2>
          <p className="text-sm text-muted-foreground">
            {(error as any)?.message || "Não foi possível carregar os detalhes do container."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => refetch()} className="rounded-xl gap-2">
              <RefreshCw className="h-4 w-4" /> Tentar Novamente
            </Button>
            <Button asChild className="rounded-xl">
              <Link to="/services">Voltar para Meus Serviços</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const isRunning = app.status === "running";
  const isPendingDeploy = (app.status as string) === "pending_deploy" || app.status === "provisioning" || (!app.template_id && !app.git_repository);
  const metrics = {
    usedRamMb: app.metrics?.usedRamMb ?? 0,
    totalRamMb: app.metrics?.totalRamMb ?? (app.memory_limit || 512),
    ramUsagePercent: app.metrics?.ramUsagePercent ?? 0,
    cpuUsagePercent: app.metrics?.cpuUsagePercent ?? 0,
    cpuCores: app.metrics?.cpuCores ?? (app.cpu_limit || 1),
    usedDiskBytes: app.metrics?.usedDiskBytes ?? 0,
    usedDiskFormatted: app.metrics?.usedDiskFormatted ?? "0 B",
    usedDiskGb: app.metrics?.usedDiskGb ?? 0,
    usedDiskMb: app.metrics?.usedDiskMb ?? 0,
    totalDiskMb: app.metrics?.totalDiskMb ?? (app as any).disk_limit_mb ?? 2048,
    totalDiskGb: app.metrics?.totalDiskGb ?? Number((((app as any).disk_limit_mb || 2048) / 1024).toFixed(1)),
    totalDiskFormatted: app.metrics?.totalDiskFormatted ?? `${Number((((app as any).disk_limit_mb || 2048) / 1024).toFixed(1))} GB`,
    diskUsagePercent: app.metrics?.diskUsagePercent ?? 0,
    uptimeSeconds: app.metrics?.uptimeSeconds ?? 0,
    uptimeFormatted: app.metrics?.uptimeFormatted ?? "0m",
    networkInKb: app.metrics?.networkInKb ?? 0,
    networkOutKb: app.metrics?.networkOutKb ?? 0,
    pids: app.metrics?.pids ?? 0,
    cpuStatus: app.metrics?.cpuStatus ?? "idle",
    ramStatus: app.metrics?.ramStatus ?? "normal",
    shouldUpgrade: app.metrics?.shouldUpgrade ?? false,
    upgradeReason: app.metrics?.upgradeReason ?? "",
    telemetryHistory: app.metrics?.telemetryHistory ?? [],
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
      case "stopped":
      default:
        return (
          <Badge variant="secondary" className="gap-1.5 py-1 px-3">
            <span className="h-2 w-2 rounded-full bg-zinc-400" /> Container Parado
          </Badge>
        );
    }
  };

  // Filtragem de logs
  const filteredLogs = logsData
    ? logsData
        .split("\n")
        .filter((line: string) => !logSearchQuery || line.toLowerCase().includes(logSearchQuery.toLowerCase()))
        .join("\n")
    : "Carregando logs do container...";

  return (
    <AppShell breadcrumb={app.name || "Gerenciar Aplicação"}>
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
              {isEditingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!editingNameInput.trim()) {
                      toast.error("O nome da aplicação não pode ficar em branco.");
                      return;
                    }
                    updateNameMutation.mutate(editingNameInput.trim());
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={editingNameInput}
                    onChange={(e) => setEditingNameInput(e.target.value)}
                    placeholder="Nome da aplicação"
                    className="h-9 text-lg sm:text-xl font-bold rounded-xl max-w-xs bg-background border-primary shadow-xs"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={updateNameMutation.isPending || !editingNameInput.trim()}
                    className="h-9 px-3 rounded-xl gap-1 text-xs font-bold"
                  >
                    {updateNameMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingNameInput(app.name);
                      setIsEditingName(false);
                    }}
                    className="h-9 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {app.name}
                  </h1>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingNameInput(app.name);
                      setIsEditingName(true);
                    }}
                    title="Editar nome da aplicação"
                    className="h-8 w-8 rounded-xl opacity-70 hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {getStatusBadge()}
            </div>
            {!isPendingDeploy && app.fqdn && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {hasCustomDomain ? (
                  <>
                    <a
                      href={`https://${activeCustomDomain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl hover:bg-emerald-500/20 flex items-center gap-1.5 font-mono font-bold transition-colors shadow-sm"
                    >
                      <Globe className="h-3.5 w-3.5 text-emerald-500" />
                      https://{activeCustomDomain}
                      <ExternalLink className="h-3 w-3 ml-0.5 opacity-70" />
                    </a>
                    <Badge variant="outline" className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5 py-1 px-2.5 rounded-lg">
                      Domínio Personalizado
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`https://${activeCustomDomain}`)}
                      className="h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </Button>
                    <span className="text-[11px] text-muted-foreground ml-1">
                      (Subdomínio original: <code className="text-zinc-600 dark:text-zinc-400 font-mono">{cleanDefaultSubdomainHost}</code>)
                    </span>
                  </>
                ) : (
                  <>
                    <a
                      href={safeOnlineUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl hover:bg-emerald-500/20 flex items-center gap-1.5 font-mono font-bold transition-colors shadow-sm"
                    >
                      <Globe className="h-3.5 w-3.5 text-emerald-500" />
                      {safeOnlineUrl}
                      <ExternalLink className="h-3 w-3 ml-0.5 opacity-70" />
                    </a>
                    <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border bg-muted/30 py-1 px-2.5 rounded-lg">
                      Subdomínio do Sistema
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(app.fqdn)}
                      className="h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Botões de Ação de Ciclo de Vida */}
          <div className="flex flex-wrap items-center gap-2">
            {isPendingDeploy ? (
              <Button 
                onClick={() => setIsTemplateModalOpen(true)}
                className="rounded-xl gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                Escolher Modelo & Fazer Deploy
              </Button>
            ) : (
              <>
                {isRunning ? (
                  <Button
                    variant="outline"
                    className="rounded-xl gap-2 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                    disabled={actionMutation.isPending}
                    onClick={() => actionMutation.mutate("stop")}
                  >
                    <Square className="h-4 w-4" />
                    Parar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="rounded-xl gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                    disabled={actionMutation.isPending}
                    onClick={() => actionMutation.mutate("start")}
                  >
                    <Play className="h-4 w-4" />
                    Iniciar
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="rounded-xl gap-2"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate("restart")}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reiniciar
                </Button>

                <Button
                  className="rounded-xl gap-2 font-bold bg-primary"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate("deploy")}
                >
                  <Zap className="h-4 w-4" />
                  Re-Deploy
                </Button>

                <Button
                  variant="outline"
                  className="rounded-xl gap-2 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                  disabled={actionMutation.isPending}
                  onClick={() => setIsStopAppConfirmOpen(true)}
                  title="Parar aplicação"
                >
                  <Trash2 className="h-4 w-4" />
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
            <TabsTrigger value="envs" className="rounded-xl gap-1.5 text-xs font-semibold relative">
              <KeyRound className="h-3.5 w-3.5" /> Variáveis (.env)
              {pendingEnvs.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                  {pendingEnvs.length}
                </span>
              )}
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
              <div className="space-y-6">
                {/* Banner de Alerta de Variáveis e Credenciais Obrigatórias Pendentes */}
                {pendingEnvs.length > 0 && (
                  <div className="p-5 sm:p-6 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent text-amber-950 dark:text-amber-100 shadow-lg shadow-amber-500/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 shadow-sm ring-1 ring-amber-500/30">
                          <KeyRound className="h-6 w-6 animate-pulse" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-base md:text-lg tracking-tight">
                              Configuração Obrigatória Pendente: Credenciais do Serviço
                            </h4>
                            <Badge variant="outline" className="bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5">
                              Ação Requerida
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
                            Este serviço possui variáveis obrigatórias com valores de exemplo (ex: chaves de autenticação ou envio de e-mail). 
                            Para conseguir acessar o painel administrativo ou operar o serviço com sucesso, <strong>insira suas credenciais reais na aba Variáveis e reinicie a aplicação</strong>.
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-semibold text-muted-foreground">Variáveis a configurar:</span>
                            {pendingEnvs.map((env) => (
                              <span
                                key={env.key}
                                className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 shadow-xs"
                              >
                                <KeyRound className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                {env.key}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-auto shrink-0 w-full sm:w-auto">
                        <Button
                          size="sm"
                          className="w-full sm:w-auto font-bold rounded-xl gap-2 shadow-md bg-amber-500 hover:bg-amber-600 text-white h-10 px-4"
                          onClick={() => setActiveTab("envs")}
                        >
                          <KeyRound className="h-4 w-4" /> Configurar Variáveis e Reiniciar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Banner de Recomendação de Upgrade e Alerta de Limites */}
                {isRunning && (metrics.shouldUpgrade || metrics.cpuStatus === "high" || metrics.cpuStatus === "critical" || metrics.ramStatus === "high" || metrics.ramStatus === "critical") && (
                  <div className={`p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all shadow-sm ${
                    metrics.cpuStatus === "critical" || metrics.ramStatus === "critical"
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100 shadow-rose-500/5"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100 shadow-amber-500/5"
                  }`}>
                    <div className="flex items-start gap-3.5">
                      <div className={`p-2.5 rounded-2xl shrink-0 ${
                        metrics.cpuStatus === "critical" || metrics.ramStatus === "critical"
                          ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                          : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      }`}>
                        <AlertTriangle className="h-6 w-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm md:text-base">
                            {metrics.cpuStatus === "critical" || metrics.ramStatus === "critical"
                              ? "Alerta Crítico: Limite de Recursos Atingido"
                              : "Consumo Elevado de Recursos Detectado"}
                          </h4>
                          <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${
                            metrics.cpuStatus === "critical" || metrics.ramStatus === "critical"
                              ? "bg-rose-500/20 border-rose-500/40 text-rose-700 dark:text-rose-300"
                              : "bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300"
                          }`}>
                            {metrics.cpuStatus === "critical" || metrics.ramStatus === "critical" ? "Gargalo Iminente" : "Requer Atenção"}
                          </Badge>
                        </div>
                        <p className="text-xs mt-1 text-muted-foreground leading-relaxed max-w-2xl">
                          {metrics.upgradeReason || "Sua aplicação está operando com alta carga em relação aos recursos alocados. Para evitar lentidão, filas de requisições ou timeouts durante testes de stress ou picos de tráfego, solicite o upgrade do seu plano."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      {app.service_id && (
                        <Button
                          size="sm"
                          className="font-bold rounded-xl gap-1.5 shadow-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                          onClick={() => navigate({ to: "/services/$serviceId", params: { serviceId: app.service_id } })}
                        >
                          <Zap className="h-4 w-4" /> Solicitar Upgrade do Plano
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Card 1: CPU */}
                  <Card className={`rounded-3xl p-6 border shadow-sm bg-card transition-all ${
                    metrics.cpuStatus === "critical"
                      ? "border-rose-500/50 hover:border-rose-500 ring-1 ring-rose-500/20"
                      : metrics.cpuStatus === "high"
                      ? "border-amber-500/50 hover:border-amber-500"
                      : "hover:border-purple-500/40"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Uso de CPU</span>
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                        metrics.cpuStatus === "critical"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          : metrics.cpuStatus === "high"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                      }`}>
                        <Cpu className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-extrabold font-mono text-foreground">{metrics.cpuUsagePercent}%</span>
                        <span className="text-xs text-muted-foreground font-mono">{metrics.cpuCores} vCPU</span>
                      </div>
                      <Progress 
                        value={Math.min(100, Math.max(metrics.cpuUsagePercent > 0 ? 3 : 0, metrics.cpuUsagePercent))} 
                        className={`h-2 rounded-full ${
                          metrics.cpuStatus === "critical"
                            ? "[&>div]:bg-rose-500"
                            : metrics.cpuStatus === "high"
                            ? "[&>div]:bg-amber-500"
                            : "[&>div]:bg-purple-500"
                        }`} 
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground font-mono pt-0.5">
                        <span>Carga do núcleo</span>
                        <strong className={`font-bold ${
                          !isRunning
                            ? "text-muted-foreground"
                            : metrics.cpuStatus === "critical"
                            ? "text-rose-600 dark:text-rose-400 flex items-center gap-1"
                            : metrics.cpuStatus === "high"
                            ? "text-amber-600 dark:text-amber-400"
                            : metrics.cpuUsagePercent > 0.05
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }`}>
                          {!isRunning
                            ? "Container Parado"
                            : metrics.cpuStatus === "critical"
                            ? "⚠️ Limite Crítico"
                            : metrics.cpuStatus === "high"
                            ? "⚡ Carga Elevada"
                            : metrics.cpuUsagePercent > 0.05
                            ? "Carga Estável"
                            : "Em Espera (Idle)"}
                        </strong>
                      </div>
                    </div>
                  </Card>

                  {/* Card 2: RAM */}
                  <Card className={`rounded-3xl p-6 border shadow-sm bg-card transition-all ${
                    metrics.ramStatus === "critical"
                      ? "border-rose-500/50 hover:border-rose-500 ring-1 ring-rose-500/20"
                      : metrics.ramStatus === "high"
                      ? "border-amber-500/50 hover:border-amber-500"
                      : "hover:border-emerald-500/40"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Uso de Memória RAM</span>
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                        metrics.ramStatus === "critical"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          : metrics.ramStatus === "high"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}>
                        <Activity className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-extrabold font-mono text-foreground">{metrics.usedRamMb} MB</span>
                        <span className="text-xs text-muted-foreground font-mono">de {metrics.totalRamMb} MB</span>
                      </div>
                      <Progress 
                        value={metrics.ramUsagePercent} 
                        className={`h-2 rounded-full ${
                          metrics.ramStatus === "critical"
                            ? "[&>div]:bg-rose-500"
                            : metrics.ramStatus === "high"
                            ? "[&>div]:bg-amber-500"
                            : "[&>div]:bg-emerald-500"
                        }`} 
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground font-mono pt-0.5">
                        <span>Alocação garantida</span>
                        <strong className={`font-bold ${
                          !isRunning
                            ? "text-muted-foreground"
                            : metrics.ramStatus === "critical"
                            ? "text-rose-600 dark:text-rose-400"
                            : metrics.ramStatus === "high"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-foreground"
                        }`}>
                          {!isRunning
                            ? "Inativo"
                            : metrics.ramStatus === "critical"
                            ? `⚠️ ${metrics.ramUsagePercent}% (Risco OOM)`
                            : metrics.ramStatus === "high"
                            ? `⚡ ${metrics.ramUsagePercent}% (Uso Alto)`
                            : `${metrics.ramUsagePercent}% utilizado`}
                        </strong>
                      </div>
                    </div>
                  </Card>

                  {/* Card 3: Disco (HD) */}
                  <Card className="rounded-3xl p-6 border shadow-sm bg-card hover:border-blue-500/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Armazenamento em Disco</span>
                      <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <HardDrive className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-extrabold font-mono text-foreground">{metrics.usedDiskFormatted}</span>
                        <span className="text-xs text-muted-foreground font-mono">de {metrics.totalDiskFormatted}</span>
                      </div>
                      <Progress value={Math.max(metrics.usedDiskBytes > 0 ? 1 : 0, metrics.diskUsagePercent)} className="h-2 rounded-full [&>div]:bg-blue-500" />
                      <div className="flex justify-between text-[11px] text-muted-foreground font-mono pt-0.5">
                        <span>SSD NVMe Corporativo</span>
                        <strong className="text-foreground">{metrics.diskUsagePercent}% alocado</strong>
                      </div>
                    </div>
                  </Card>

                  {/* Card 4: Tráfego de Rede (I/O) & Processos */}
                  <Card className="rounded-3xl p-6 border shadow-sm bg-card hover:border-cyan-500/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rede I/O & Processos</span>
                      <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                        <Wifi className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-extrabold font-mono text-foreground">
                          {metrics.networkOutKb > 1024 * 1024 
                            ? `${(metrics.networkOutKb / (1024 * 1024)).toFixed(1)} GB`
                            : metrics.networkOutKb > 1024
                            ? `${(metrics.networkOutKb / 1024).toFixed(1)} MB`
                            : `${metrics.networkOutKb || 0} KB`}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {metrics.pids ? `${metrics.pids} PIDs ativos` : "1 processo"}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(100, Math.max(metrics.networkOutKb > 0 ? 2 : 0, Math.round((metrics.networkOutKb / (500 * 1024)) * 100)))} 
                        className="h-2 rounded-full [&>div]:bg-cyan-500" 
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground font-mono pt-0.5">
                        <span>↓ In: {metrics.networkInKb > 1024 ? `${(metrics.networkInKb / 1024).toFixed(1)} MB` : `${metrics.networkInKb || 0} KB`}</span>
                        <strong className="text-cyan-600 dark:text-cyan-400 font-bold">
                          {isRunning ? (metrics.networkOutKb > 50000 ? "Alto Fluxo de Dados" : "Tráfego Estável") : "Inativo"}
                        </strong>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* GRÁFICO E HISTÓRICO DE RECURSOS & UPTIME (24 HORAS, 7 DIAS E 30 DIAS) */}
                <UptimeMonitoringSection
                  appId={appId}
                  appName={app.name}
                  fqdn={app.fqdn}
                  status={app.status}
                  createdAt={app.created_at}
                  updatedAt={app.updated_at || app.created_at || new Date().toISOString()}
                  metrics={metrics}
                />
              </div>
            )}

            {!isPendingDeploy && (
              <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
                <CardHeader className="bg-muted/20 border-b pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {app.template_id?.includes("postgres") || app.template_id?.includes("mysql") || app.template_id?.includes("redis") ? (
                          <Database className="h-5 w-5 text-primary" />
                        ) : (
                          <Globe className="h-5 w-5 text-primary" />
                        )}
                        <CardTitle className="text-base font-bold">
                          {app.template_id?.includes("postgres") || app.template_id?.includes("mysql") || app.template_id?.includes("redis")
                            ? "Conexões & Painel Web do Banco de Dados"
                            : app.template_id?.includes("typebot")
                            ? "Portas & Endpoints do Cluster Typebot"
                            : "Portas & Endpoints Públicos"}
                        </CardTitle>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                          Cluster DK1 • Traefik Ingress
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        Roteamento multi-porta inteligente com portas dedicadas e proxy reverso de alta performance.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 divide-y divide-border/60">
                  {/* CASO 1: BANCOS DE DADOS STANDALONE */}
                  {(app.template_id?.includes("postgres") || app.template_id?.includes("mysql") || app.template_id?.includes("redis")) ? (
                    (() => {
                      const cleanAppHash = extractAppHash12(app.id || (app as any).service_id);
                      const dbType = app.template_id.includes("postgres") ? "postgres" : app.template_id.includes("mysql") ? "mysql" : "redis";
                      const dbPort = calculateDatabasePort(cleanAppHash, dbType);
                      const hostIp = "45.159.172.137";
                      const connUri = dbType === "postgres"
                        ? `postgresql://postgres:eqsam_pg_${cleanAppHash}@${hostIp}:${dbPort}/main`
                        : dbType === "mysql"
                        ? `mysql://dbuser:eqsam_mysql_${cleanAppHash}@${hostIp}:${dbPort}/main`
                        : `redis://:eqsam_redis_${cleanAppHash}@${hostIp}:${dbPort}`;
                      const adminWebUrl = `http://admin-${cleanAppHash}.dk1.eqsam.com`;

                      return (
                        <>
                          {/* Porta Direta TCP do Banco */}
                          <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">Conexão Direta TCP (Driver / CLI / Externo)</span>
                                <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
                                  Porta {dbPort}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">{hostIp}:{dbPort}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono text-primary font-semibold bg-primary/10 px-2.5 py-1 rounded-lg break-all">
                                  {connUri}
                                </code>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-xl text-xs gap-1.5"
                                onClick={() => copyToClipboard(connUri)}
                              >
                                <Copy className="h-3.5 w-3.5" /> Copiar String de Conexão
                              </Button>
                            </div>
                          </div>

                          {/* Painel Web (Adminer / Redis Commander) */}
                          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {dbType === "redis" ? "Redis Commander (Web UI)" : "Adminer SQL (Web UI)"}
                                </span>
                                <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                  Porta 8080 • Web
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">Gerenciador Web Embutido</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-lg break-all">
                                  {adminWebUrl}
                                </code>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-xl text-xs gap-1.5"
                                onClick={() => copyToClipboard(adminWebUrl)}
                              >
                                <Copy className="h-3.5 w-3.5" /> Copiar URL
                              </Button>
                              <Button
                                size="sm"
                                asChild
                                className="h-8 rounded-xl text-xs gap-1.5 bg-primary font-bold shadow-sm"
                              >
                                <a href={adminWebUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" /> Acessar Web UI
                                </a>
                              </Button>
                            </div>
                          </div>
                        </>
                      );
                    })()
                  ) : app.template_id?.includes("typebot") ? (
                    (() => {
                      const cleanAppHash = extractAppHash12(app.id || (app as any).service_id);
                      const viewerUrl = `http://viewer-${cleanAppHash}.dk1.eqsam.com`;

                      return (
                        <>
                          {/* Typebot Builder */}
                          <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">Typebot Builder (Editor Visual & Fluxos)</span>
                                <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
                                  Porta 3000
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">Painel de Criação</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono text-primary font-semibold bg-primary/10 px-2.5 py-1 rounded-lg break-all">
                                  {app.fqdn}
                                </code>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-xl text-xs gap-1.5"
                                onClick={() => copyToClipboard(app.fqdn)}
                              >
                                <Copy className="h-3.5 w-3.5" /> Copiar URL
                              </Button>
                              <Button
                                size="sm"
                                asChild
                                className="h-8 rounded-xl text-xs gap-1.5 bg-primary font-bold shadow-sm"
                              >
                                <a href={safeOnlineUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" /> Acessar Builder
                                </a>
                              </Button>
                            </div>
                          </div>

                          {/* Typebot Viewer */}
                          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">Typebot Viewer (Chatbot Público & Embed)</span>
                                <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                  Porta 3001
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">Chatbot de Atendimento</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-lg break-all">
                                  {viewerUrl}
                                </code>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-xl text-xs gap-1.5"
                                onClick={() => copyToClipboard(viewerUrl)}
                              >
                                <Copy className="h-3.5 w-3.5" /> Copiar URL
                              </Button>
                              <Button
                                size="sm"
                                asChild
                                className="h-8 rounded-xl text-xs gap-1.5 bg-primary font-bold shadow-sm"
                              >
                                <a href={viewerUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" /> Acessar Chatbot
                                </a>
                              </Button>
                            </div>
                          </div>
                        </>
                      );
                    })()
                  ) : app.template_id?.includes("openstatus") ? (
                    (() => {
                      const cleanAppHash = extractAppHash12(app.id || (app as any).service_id);
                      const adminDashboardUrl = `https://admin-openstatus-${cleanAppHash}.dk1.eqsam.com`;

                      return (
                        <>
                          {/* Página de Status Pública */}
                          <div className="py-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">Página de Status (Pública)</span>
                                <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
                                  Porta 3000 • Web
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">Visão dos Clientes</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono text-primary font-semibold bg-primary/10 px-2.5 py-1 rounded-lg break-all">
                                  {safeOnlineUrl}
                                </code>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-xl text-xs gap-1.5"
                                onClick={() => copyToClipboard(safeOnlineUrl)}
                              >
                                <Copy className="h-3.5 w-3.5" /> Copiar URL
                              </Button>
                              <Button
                                size="sm"
                                asChild
                                className="h-8 rounded-xl text-xs gap-1.5 bg-primary font-bold shadow-sm"
                              >
                                <a href={safeOnlineUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" /> Acessar Status Page
                                </a>
                              </Button>
                            </div>
                          </div>

                          {/* Dashboard Administrativo */}
                          <div className="py-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">Dashboard Administrativo (Admin)</span>
                                <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                                  Porta 3000 • Painel Next.js
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">Gerenciador de Monitores</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-lg break-all">
                                  {adminDashboardUrl}
                                </code>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-xl text-xs gap-1.5"
                                onClick={() => copyToClipboard(adminDashboardUrl)}
                              >
                                <Copy className="h-3.5 w-3.5" /> Copiar URL
                              </Button>
                              <Button
                                size="sm"
                                asChild
                                className="h-8 rounded-xl text-xs gap-1.5 bg-primary font-bold shadow-sm"
                              >
                                <a href={adminDashboardUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" /> Acessar Dashboard Admin
                                </a>
                              </Button>
                            </div>
                          </div>

                          <div className={`p-3.5 rounded-2xl border text-[11px] space-y-2 ${
                            pendingEnvs.some((e) => e.key === "RESEND_API_KEY")
                              ? "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200"
                              : "bg-muted/40 border text-muted-foreground"
                          }`}>
                            <div className="font-semibold text-foreground flex items-center justify-between gap-1.5 flex-wrap">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Credenciais e Autenticação do Dashboard
                              </span>
                              {pendingEnvs.some((e) => e.key === "RESEND_API_KEY") && (
                                <Badge variant="outline" className="text-[9px] font-extrabold uppercase text-amber-700 dark:text-amber-300 border-amber-500/50 bg-amber-500/20">
                                  Chave Resend Pendente
                                </Badge>
                              )}
                            </div>
                            <p className="leading-relaxed">
                              Usuário inicial provisionado: <code className="font-mono font-bold text-foreground">ping@openstatus.dev</code>. O OpenStatus opera com Magic Links (NextAuth).
                              {pendingEnvs.some((e) => e.key === "RESEND_API_KEY") ? (
                                <span className="block mt-1.5 font-medium text-amber-800 dark:text-amber-300">
                                  ⚠️ <strong>Atenção:</strong> Sua chave <code className="font-mono font-bold bg-amber-500/20 px-1 py-0.5 rounded">RESEND_API_KEY</code> ainda está com o valor temporário de exemplo. O envio do Magic Link para autenticação no painel falhará até que você cadastre sua chave real do Resend na aba <strong>Variáveis</strong> e reinicie a aplicação.
                                </span>
                              ) : (
                                <span> Para envio de links de login por e-mail em produção, cadastre sua chave gratuita <code className="font-mono text-primary font-semibold">RESEND_API_KEY</code> na aba <strong>Variáveis</strong> acima.</span>
                              )}
                            </p>
                            {pendingEnvs.some((e) => e.key === "RESEND_API_KEY") && (
                              <div className="pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs rounded-xl gap-1.5 border-amber-500/50 hover:bg-amber-500/20 text-amber-900 dark:text-amber-100 font-bold"
                                  onClick={() => setActiveTab("envs")}
                                >
                                  <KeyRound className="h-3 w-3" /> Configurar RESEND_API_KEY na aba Variáveis
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      {/* Endpoint Principal Web */}
                      <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">Porta Principal (Web)</span>
                            <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
                              Porta {app.template_id?.includes("wordpress") ? 80 : app.template_id?.includes("evolution") ? 8080 : app.template_id?.includes("kuma") ? 3001 : app.template_id?.includes("n8n") ? 5678 : 3000}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">HTTP / HTTPS</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono text-primary font-semibold bg-primary/10 px-2.5 py-1 rounded-lg break-all">
                              {safeOnlineUrl}
                            </code>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-xl text-xs gap-1.5"
                            onClick={() => copyToClipboard(safeOnlineUrl)}
                          >
                            <Copy className="h-3.5 w-3.5" /> Copiar URL
                          </Button>
                          <Button
                            size="sm"
                            asChild
                            className="h-8 rounded-xl text-xs gap-1.5 bg-primary font-bold shadow-sm"
                          >
                            <a href={safeOnlineUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" /> Acessar
                            </a>
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
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
                    <span className="text-muted-foreground">Isolamento de Recursos (Swarm)</span>
                    <span className="font-semibold text-foreground font-mono">
                      {app.cpu_limit} vCPU • {app.memory_limit} MB RAM (Cgroups Ativo)
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Proteção de Cluster Host</span>
                    <span className="font-semibold text-lime-600 dark:text-lime-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-lime-500" /> Limites Estritos de Kernel Ativos
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

                {/* Divisão de Recursos por Container (Multi-Container Breakdown) */}
                {(metrics as any)?.containerBreakdown && (metrics as any).containerBreakdown.length > 0 && (
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Divisão de Recursos por Container ({(metrics as any).containerBreakdown.length} ativos)
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                        Isolamento Cgroups v2
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(metrics as any).containerBreakdown.map((ct: any) => (
                        <div key={ct.id || ct.name} className="p-3.5 rounded-2xl bg-muted/30 border text-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground capitalize flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              {ct.role || ct.name}
                            </span>
                            <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                              {ct.pids ? `${ct.pids} PIDs` : "1 PID"}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-muted-foreground font-mono text-[11px]">
                            <div className="flex justify-between">
                              <span>RAM em Uso:</span>
                              <strong className="text-foreground">{ct.usedRamMb} MB</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Carga CPU:</span>
                              <strong className="text-foreground">{ct.cpuPercent}%</strong>
                            </div>
                            {ct.image && (
                              <div className="truncate text-[10px] text-muted-foreground/70 pt-0.5" title={ct.image}>
                                {ct.image}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. ABA: GERENCIADOR DE ARQUIVOS & EDITOR REAL */}
          <TabsContent value="files" className="space-y-6">
            <FileManagerView appId={appId} containerRoot={app?.container_root} />
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
                    disabled={deployGitMutation.isPending || actionMutation.isPending}
                    onClick={() => {
                      if (!gitRepoInput.trim()) {
                        toast.error("Por favor, informe a URL do repositório Git.");
                        return;
                      }
                      // Se o container já possuir um serviço ou arquivos ativos, abre confirmação de reset
                      const hasExistingService = Boolean(
                        app?.name || app?.template_id || app?.git_repository || app?.status === "running"
                      );
                      if (hasExistingService) {
                        setIsGitDeployConfirmOpen(true);
                      } else {
                        deployGitMutation.mutate({
                          gitRepository: gitRepoInput.trim(),
                          gitBranch: gitBranchInput.trim() || "main",
                        });
                      }
                    }}
                  >
                    {deployGitMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
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
            <ContainerLogsViewer
              logs={logsData || ""}
              appName={app.name}
              buildPack={app.build_pack}
              isLoading={isFetchingLogs}
              onRefresh={() => refetchLogs()}
            />
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        const next = !showSecrets;
                        setShowSecrets(next);
                        setVisibleSecretsMap({});
                      }}
                      className="rounded-xl gap-1.5 text-xs font-semibold"
                    >
                      {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showSecrets ? "Ocultar Valores" : "Revelar Todos"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEnvsList([...envsList, { key: "", value: "" }])}
                      className="rounded-xl gap-1.5 text-xs font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Variável
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => saveEnvsMutation.mutate({ shouldRestart: true })}
                      disabled={saveEnvsMutation.isPending || actionMutation.isPending}
                      className={`rounded-xl gap-1.5 text-xs font-bold shadow-sm ${
                        pendingEnvs.length > 0 
                          ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20" 
                          : "bg-primary hover:bg-primary/90 text-primary-foreground"
                      }`}
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${(saveEnvsMutation.isPending || actionMutation.isPending) ? "animate-spin" : ""}`} /> 
                      Salvar e Reiniciar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Banner de Atenção Especial para Credenciais Pendentes */}
                {pendingEnvs.length > 0 && (
                  <div className="bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900 dark:text-amber-100 shadow-sm animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-foreground">
                          Existem {pendingEnvs.length} variável(is) com valores de exemplo pendentes de configuração
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Substitua os valores indicados abaixo por suas credenciais reais. Em seguida, clique em <strong>Salvar e Reiniciar Serviço</strong> para recarregar o container com as novas configurações ativas.
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => saveEnvsMutation.mutate({ shouldRestart: true })}
                      disabled={saveEnvsMutation.isPending || actionMutation.isPending}
                      className="shrink-0 rounded-xl gap-2 font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-sm h-9 px-4"
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${(saveEnvsMutation.isPending || actionMutation.isPending) ? "animate-spin" : ""}`} /> 
                      Salvar e Reiniciar Serviço
                    </Button>
                  </div>
                )}

                {/* Banner de Instruções e Orientações para o Cliente */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Como funcionam as Variáveis de Ambiente (.env)</p>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Utilize esta área para definir variáveis personalizadas para o seu bot ou aplicação (ex: <code className="bg-amber-500/10 px-1 py-0.5 rounded font-mono font-bold text-amber-600 dark:text-amber-300">DISCORD_TOKEN</code>, <code className="bg-amber-500/10 px-1 py-0.5 rounded font-mono font-bold text-amber-600 dark:text-amber-300">BOT_TOKEN</code>, <code className="bg-amber-500/10 px-1 py-0.5 rounded font-mono font-bold text-amber-600 dark:text-amber-300">DATABASE_URL</code>). Elas são injetadas de forma criptografada no container.
                    </p>
                    <p className="font-semibold text-amber-600 dark:text-amber-300 pt-1">
                      ⚡ <strong>Atenção:</strong> Processos em execução só carregam novas variáveis durante a inicialização. Após salvar, <strong>é necessário reiniciar ou fazer Re-Deploy da aplicação</strong> para que elas tenham efeito.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {envsList.map((env, index) => {
                    const isPending = isEnvPending(env);
                    return (
                      <div
                        key={index}
                        className={`transition-all ${
                          isPending
                            ? "p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 shadow-sm space-y-2"
                            : "flex gap-2 items-center"
                        }`}
                      >
                        {isPending && (
                          <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 px-1">
                            <span className="flex items-center gap-1.5">
                              <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              Variável Obrigatória • Substitua o valor de exemplo por sua credencial real:
                            </span>
                            <Badge variant="outline" className="text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40">
                              Ação Requerida
                            </Badge>
                          </div>
                        )}
                        <div className="flex gap-2 items-center w-full">
                          <Input
                            value={env.key}
                            onChange={(e) => {
                              const updated = [...envsList];
                              const item = updated[index];
                              if (item) {
                                item.key = e.target.value;
                                setEnvsList(updated);
                              }
                            }}
                            placeholder="NOME_DA_VARIAVEL"
                            className={`rounded-xl font-mono text-xs font-semibold uppercase flex-1 ${
                              isPending ? "border-amber-500/40 bg-background" : ""
                            }`}
                          />
                          <div className="relative flex-1">
                            <Input
                              type={isRowSecretVisible(index) ? "text" : "password"}
                              value={env.value}
                              onChange={(e) => {
                                const updated = [...envsList];
                                const item = updated[index];
                                if (item) {
                                  item.value = e.target.value;
                                  setEnvsList(updated);
                                }
                              }}
                              placeholder="valor_secreto_ou_configuracao"
                              className={`rounded-xl font-mono text-xs pr-9 w-full ${
                                isPending ? "border-amber-500/60 bg-background font-bold text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/20" : ""
                              }`}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              tabIndex={-1}
                              onClick={() => toggleRowSecret(index)}
                              title={isRowSecretVisible(index) ? "Ocultar valor desta variável" : "Mostrar valor desta variável"}
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors"
                            >
                              {isRowSecretVisible(index) ? (
                                <EyeOff className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
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
                      </div>
                    );
                  })}

                  {envsList.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Nenhuma variável de ambiente definida. Adicione variáveis acima para injetá-las no container.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    Dica: utilize <strong>Salvar e Reiniciar Serviço</strong> para aplicar as novas configurações imediatamente.
                  </span>
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <Button 
                      variant="outline"
                      onClick={() => saveEnvsMutation.mutate({ shouldRestart: false })}
                      disabled={saveEnvsMutation.isPending || actionMutation.isPending}
                      className="rounded-xl gap-2 font-semibold text-xs"
                    >
                      <Save className="h-3.5 w-3.5" /> Apenas Salvar
                    </Button>
                    <Button 
                      onClick={() => saveEnvsMutation.mutate({ shouldRestart: true })}
                      disabled={saveEnvsMutation.isPending || actionMutation.isPending}
                      className={`rounded-xl gap-2 font-bold text-xs shadow-sm ${
                        pendingEnvs.length > 0
                          ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                          : "bg-primary hover:bg-primary/90 text-primary-foreground"
                      }`}
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${(saveEnvsMutation.isPending || actionMutation.isPending) ? "animate-spin" : ""}`} /> 
                      Salvar e Reiniciar Serviço
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 6. ABA: DOMÍNIOS & SSL */}
          <TabsContent value="domains" className="space-y-6">
            {/* Header explicativo da aba */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-brand/5 to-transparent border border-emerald-500/20 p-5 sm:p-6 rounded-3xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                <Globe className="h-5 w-5 text-emerald-500" />
                <span>Gerenciamento de Domínio & Conexão Web</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Para que seus visitantes acessem sua aplicação, ela possui um <strong>subdomínio padrão gratuito</strong> da EQSAM Cloud que já está funcionando. 
                Se você possui um <strong>domínio próprio registrado</strong> (como <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">seusite.com.br</code>), conecte-o abaixo para que nosso cluster reconheça suas requisições e gere o Certificado SSL de segurança automaticamente.
              </p>
            </div>

            {/* CARD 1: SUBDOMÍNIO PADRÃO DO SISTEMA */}
            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-bold">1. Subdomínio Padrão da EQSAM</CardTitle>
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativo & Funcional
                      </Badge>
                      <Badge variant="outline" className="text-[11px] gap-1 text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/5">
                        <ShieldCheck className="h-3 w-3 text-sky-500" /> SSL Ativo
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Endereço nativo disponibilizado pela infraestrutura. Funciona imediatamente sem necessidade de configurações de DNS.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/40 rounded-2xl border font-mono text-sm">
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="truncate font-semibold text-foreground select-all">{defaultSubdomain}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="rounded-xl h-8 px-3 text-xs gap-1.5"
                    >
                      <a href={defaultSubdomain} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir Site
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(defaultSubdomain, "subdomain")}
                      className="rounded-xl h-8 px-3 text-xs gap-1.5"
                    >
                      {copiedDnsKey === "subdomain" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      Copiar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: CONECTAR DOMÍNIO PERSONALIZADO */}
            <Card className="rounded-3xl border shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-bold">2. Conectar Seu Domínio Personalizado</CardTitle>
                      {hasCustomDomain && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Vinculado ao Sistema
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      Informe qual o seu domínio para que o sistema saiba que os acessos a ele devem abrir esta aplicação.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Se já tiver domínio personalizado conectado */}
                {hasCustomDomain ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/25 p-4 sm:p-5 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Lock className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-base font-bold text-foreground">
                              https://{activeCustomDomain}
                            </span>
                            <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                              SSL HTTPS Ativo
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            O cluster EQSAM está configurado para receber requisições deste domínio.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          asChild
                          className="rounded-xl h-8 px-3 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <a href={`https://${activeCustomDomain}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> Visitar Domínio
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => verifyDnsMutation.mutate(activeCustomDomain)}
                          disabled={isVerifyingDns}
                          className="rounded-xl h-8 px-3 text-xs gap-1.5 font-semibold"
                        >
                          {isVerifyingDns ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5 text-primary" />}
                          Testar DNS
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resetDomainMutation.mutate()}
                          disabled={resetDomainMutation.isPending}
                          className="rounded-xl h-8 px-3 text-xs gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Voltar ao Padrão
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 border p-4 rounded-2xl space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-primary shrink-0" />
                      <span><strong>Por que adicionar seu domínio aqui?</strong> Nosso balanceador de carga inteligente (Traefik) precisa saber exatamente o nome do seu domínio para rotear o tráfego da internet até este container e emitir a chave criptográfica SSL Let's Encrypt para seu endereço.</span>
                    </p>
                  </div>
                )}

                {/* Formulário de Adicionar / Alterar Domínio */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">
                      {hasCustomDomain ? "Alterar Domínio Personalizado" : "Digite seu Domínio Próprio"}
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Ex: meusite.com.br ou app.meusite.com</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground select-none pointer-events-none">
                        https://
                      </div>
                      <Input
                        value={customDomainInput}
                        onChange={(e) => setCustomDomainInput(e.target.value)}
                        placeholder="meusite.com.br ou app.meusite.com"
                        className="rounded-xl font-mono text-sm pl-20"
                      />
                    </div>
                    <Button 
                      onClick={() => saveDomainMutation.mutate(customDomainInput)}
                      disabled={saveDomainMutation.isPending || !customDomainInput.trim()}
                      className="rounded-xl gap-2 font-bold px-5 bg-primary text-primary-foreground shadow-sm shrink-0"
                    >
                      {saveDomainMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Salvar e Conectar Domínio
                    </Button>
                  </div>

                  {/* Atalho de Domínios da Conta */}
                  {userDomains && userDomains.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] text-muted-foreground block mb-1.5">
                        Domínios registrados na sua conta EQSAM:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {userDomains.map((d: any) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setCustomDomainInput(d.domain_name);
                              toast.info(`Domínio ${d.domain_name} selecionado! Clique em 'Salvar e Conectar Domínio'.`);
                            }}
                            className="text-xs font-mono px-2.5 py-1 rounded-lg border bg-background hover:bg-muted text-foreground transition-colors flex items-center gap-1"
                          >
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            {d.domain_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CARD 3: PASSO A PASSO DE APONTAMENTO DNS */}
            <Card className="rounded-3xl border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold">3. Como Fazer o Apontamento DNS no Seu Provedor</CardTitle>
                </div>
                <CardDescription className="text-xs leading-relaxed">
                  Acesse a <strong>Zona DNS</strong> onde seu domínio está registrado (ex: Registro.br, Cloudflare, GoDaddy ou EQSAM) e configure um dos registros abaixo:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Opção A: CNAME */}
                  <div className="p-4 rounded-2xl border bg-card/60 hover:border-emerald-500/40 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                          Recomendado
                        </Badge>
                        <span className="text-xs font-bold">Opção A: Subdomínio ou WWW</span>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">CNAME</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Use esta opção para apontar <code className="font-mono text-foreground">www.seusite.com</code> ou um subdomínio como <code className="font-mono text-foreground">app.seusite.com</code>:
                    </p>
                    <div className="space-y-2 bg-muted/40 p-3 rounded-xl text-xs font-mono border">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[10px]">TIPO:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">CNAME</span>
                          <button onClick={() => copyToClipboard("CNAME", "cname-type")} className="text-muted-foreground hover:text-foreground">
                            {copiedDnsKey === "cname-type" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t pt-1.5">
                        <span className="text-muted-foreground text-[10px]">NOME / HOST:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">www <span className="text-muted-foreground font-normal">(ou subdomínio)</span></span>
                          <button onClick={() => copyToClipboard("www", "cname-host")} className="text-muted-foreground hover:text-foreground">
                            {copiedDnsKey === "cname-host" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t pt-1.5">
                        <span className="text-muted-foreground text-[10px]">DESTINO / VALOR:</span>
                        <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate">{cleanDefaultSubdomainHost}</span>
                          <button onClick={() => copyToClipboard(cleanDefaultSubdomainHost, "cname-val")} className="text-muted-foreground hover:text-foreground shrink-0">
                            {copiedDnsKey === "cname-val" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Opção B: TIPO A */}
                  <div className="p-4 rounded-2xl border bg-card/60 hover:border-emerald-500/40 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Opção B: Domínio Principal / Raiz</span>
                      <Badge variant="outline" className="font-mono text-[10px]">TIPO A</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Use esta opção para apontar a raiz <code className="font-mono text-foreground">seusite.com.br</code> diretamente ao cluster:
                    </p>
                    <div className="space-y-2 bg-muted/40 p-3 rounded-xl text-xs font-mono border">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[10px]">TIPO:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">A</span>
                          <button onClick={() => copyToClipboard("A", "a-type")} className="text-muted-foreground hover:text-foreground">
                            {copiedDnsKey === "a-type" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t pt-1.5">
                        <span className="text-muted-foreground text-[10px]">NOME / HOST:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">@ <span className="text-muted-foreground font-normal">(ou deixe em branco)</span></span>
                          <button onClick={() => copyToClipboard("@", "a-host")} className="text-muted-foreground hover:text-foreground">
                            {copiedDnsKey === "a-host" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t pt-1.5">
                        <span className="text-muted-foreground text-[10px]">DESTINO / IP:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">45.159.172.137</span>
                          <button onClick={() => copyToClipboard("45.159.172.137", "a-val")} className="text-muted-foreground hover:text-foreground">
                            {copiedDnsKey === "a-val" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DIAGNÓSTICO EM TEMPO REAL DE DNS */}
                <div className="pt-2">
                  <div className="p-4 rounded-2xl border bg-muted/20 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Wifi className="h-3.5 w-3.5 text-primary" /> Verificador de Apontamento DNS em Tempo Real
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Teste se o seu provedor de domínio já propagou o apontamento para o cluster EQSAM.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => verifyDnsMutation.mutate(customDomainInput || activeCustomDomain)}
                        disabled={isVerifyingDns || (!customDomainInput && !activeCustomDomain)}
                        className="rounded-xl h-8 text-xs gap-1.5 font-semibold shrink-0"
                      >
                        {isVerifyingDns ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verificando DNS...
                          </>
                        ) : (
                          <>
                            <Search className="h-3.5 w-3.5" /> Testar Apontamento Agora
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Exibição do Resultado do DNS */}
                    {dnsCheckResult && (
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                        dnsCheckResult.isConfigured 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" 
                          : dnsCheckResult.status === "wrong_ip"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                          : "bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300"
                      }`}>
                        {dnsCheckResult.isConfigured ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : dnsCheckResult.status === "wrong_ip" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <RefreshCw className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <p className="font-semibold">{dnsCheckResult.message}</p>
                          {dnsCheckResult.aRecords && dnsCheckResult.aRecords.length > 0 && (
                            <p className="text-[11px] opacity-80 font-mono">
                              IPs encontrados: [{dnsCheckResult.aRecords.join(", ")}] | IP esperado: 45.159.172.137
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bloco informativo de SSL Let's Encrypt */}
                <div className="bg-muted/40 p-4 rounded-2xl border space-y-2 text-xs">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-lime-500" /> Certificado SSL Let's Encrypt 100% Automático
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Você não precisa gerar CSR, instalar arquivos de certificado ou pagar nada a mais. Assim que seu apontamento DNS for propagado (normalmente entre 5 e 30 minutos), nosso proxy reverso emite e renova o certificado SSL HTTPS de 256 bits de forma totalmente automatizada.
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
                        {appRoot}/{selectedFilePath}
                      </DialogTitle>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono border-zinc-700 text-zinc-300">
                        {selectedFilePath.split(".").pop() || "CODE"}
                      </Badge>
                    </div>
                    <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                      Diretório raiz seguro ({appRoot}). Salve para atualizar seu arquivo no servidor.
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
                <Label>Pasta de Destino (deixe em branco para raiz {appRoot})</Label>
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
                  const appDisk = (app as any)?.service?.products?.disk_quota_mb || app.disk_limit_mb || 1536;
                  const requiredDiskWithMargin = getRequiredDiskWithMargin(tpl.recommended_disk);
                  const isRamOk = (app.memory_limit || 512) >= (tpl.recommended_ram || 256);
                  const isDiskOk = appDisk >= requiredDiskWithMargin;
                  const isCpuOk = !tpl.recommended_cpu || (app.cpu_limit || 0.5) >= tpl.recommended_cpu;
                  const isUnderpowered = !isRamOk || !isDiskOk || !isCpuOk;

                  let warningReason = "";
                  if (!isDiskOk) {
                    warningReason = `Requer ${requiredDiskWithMargin}MB Disco (+20%) (Seu plano: ${appDisk}MB)`;
                  } else if (!isRamOk) {
                    warningReason = `Requer ${tpl.recommended_ram}MB RAM (Seu plano: ${app.memory_limit}MB)`;
                  } else {
                    warningReason = `Requer ${tpl.recommended_cpu} vCPU (Seu plano: ${app.cpu_limit || 0.5} vCPU)`;
                  }

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
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                              Min {tpl.recommended_ram || 256}MB RAM
                            </Badge>
                            <Badge variant="secondary" className="text-[9px] font-mono shrink-0 text-muted-foreground">
                              {requiredDiskWithMargin}MB HD (+20%)
                            </Badge>
                          </div>
                        </div>
                        <h4 className="font-bold text-sm text-foreground">{tpl.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
                        {!isUnderpowered ? (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="size-3 shrink-0" />
                            100% Compatível com seu container
                          </p>
                        ) : (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                            <AlertTriangle className="size-3 shrink-0" />
                            {warningReason}
                          </p>
                        )}
                        {isUnderpowered ? (
                          <Link to="/plans" search={{ tab: "paas" }} className="w-full">
                            <Button
                              size="sm"
                              className="w-full rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              <Sparkles className="size-3.5" />
                              Fazer Upgrade do Plano
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            size="sm"
                            disabled={applyTemplateMutation.isPending}
                            onClick={() => applyTemplateMutation.mutate(tpl)}
                            className="w-full rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90"
                          >
                            <Zap className="size-3.5" />
                            {applyTemplateMutation.isPending ? "Iniciando..." : "Instalar Neste App"}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
            </div>
          </DialogContent>
        </Dialog>

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
                <div>
                  {deploymentStatus === "finished" ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">Online 24/7</Badge>
                  ) : deploymentStatus === "failed" ? (
                    <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40">Falha no Build</Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse">Compilando...</Badge>
                  )}
                </div>
              </div>

              {/* Stepper de Fases do Deploy */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-zinc-800 text-[11px]">
                <div className={`p-2 rounded-xl border flex flex-col gap-1 ${deployStep >= 1 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>
                  <span className="font-bold flex items-center gap-1">
                    {deployStep > 1 ? <Check className="h-3 w-3" /> : "1."} Recursos
                  </span>
                  <span className="text-[10px] opacity-80">{app.memory_limit}MB RAM</span>
                </div>
                <div className={`p-2 rounded-xl border flex flex-col gap-1 ${deployStep >= 2 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>
                  <span className="font-bold flex items-center gap-1">
                    {deployStep > 2 ? <Check className="h-3 w-3" /> : "2."} Repositório
                  </span>
                  <span className="text-[10px] opacity-80">Git / ZIP</span>
                </div>
                <div className={`p-2 rounded-xl border flex flex-col gap-1 ${deployStep >= 3 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>
                  <span className="font-bold flex items-center gap-1">
                    {deployStep > 3 ? <Check className="h-3 w-3" /> : "3."} Build Docker
                  </span>
                  <span className="text-[10px] opacity-80">Compilação</span>
                </div>
                <div className={`p-2 rounded-xl border flex flex-col gap-1 ${deployStep >= 4 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>
                  <span className="font-bold flex items-center gap-1">
                    {deployStep >= 4 ? <Check className="h-3 w-3" /> : "4."} SSL / Online
                  </span>
                  <span className="text-[10px] opacity-80">Let's Encrypt</span>
                </div>
              </div>
            </DialogHeader>

            {/* Terminal de Logs do Deploy */}
            <div className="flex-1 bg-black p-4 font-mono text-xs overflow-y-auto max-h-[360px] space-y-1">
              {deploymentLogs.length === 0 && (
                <div className="text-zinc-500 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Conectando ao daemon de build do cluster...
                </div>
              )}
              {deploymentLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`leading-relaxed whitespace-pre-wrap ${log.type === "stderr" ? "text-rose-400" : "text-emerald-400"}`}
                >
                  {log.output}
                </div>
              ))}
              <div ref={terminalLogsEndRef} />
            </div>

            {/* Footer com Ações */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
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

              <div className="flex gap-2">
                {deploymentStatus === "finished" && safeOnlineUrl && (
                  <Button asChild size="sm" className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                    <a href={safeOnlineUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Acessar Aplicação Online
                    </a>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsDeployModalOpen(false)}
                  className="rounded-xl border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  {deploymentStatus === "finished" ? "Concluir" : "Fechar Modal (Manter em 2º plano)"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação para Reset Total / Exclusão do Serviço e Limpeza do Container */}
        <AlertDialog open={isStopAppConfirmOpen} onOpenChange={setIsStopAppConfirmOpen}>
          <AlertDialogContent className="rounded-3xl border border-border bg-card p-6 shadow-2xl max-w-md">
            <AlertDialogHeader className="space-y-3">
              <div className="size-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center border border-destructive/25">
                <Trash2 className="size-6" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-foreground">
                Excluir Serviço e Resetar Container?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
                <span className="block">
                  Deseja realmente excluir permanentemente o serviço <strong className="text-foreground font-semibold">"{app?.name}"</strong>?
                </span>
                <span className="block text-rose-500 font-semibold">
                  ⚠️ AÇÃO IRREVERSÍVEL: Todos os arquivos, volumes, banco de dados e dados do serviço atual serão permanentemente apagados do servidor.
                </span>
                <span className="block">
                  O container retornará ao <strong>estado inicial limpo</strong>, permitindo que você escolha um novo modelo ou suba outro código do zero.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-5 gap-2 sm:gap-0">
              <AlertDialogCancel disabled={resetMutation.isPending} className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={resetMutation.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  resetMutation.mutate();
                }}
                className="rounded-xl h-10 px-5 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              >
                {resetMutation.isPending ? "Excluindo..." : "Sim, Excluir Definitivamente"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Confirmação para Deploy de Git (Reset do Container Existente) */}
        <AlertDialog open={isGitDeployConfirmOpen} onOpenChange={setIsGitDeployConfirmOpen}>
          <AlertDialogContent className="rounded-3xl border border-border bg-card p-6 shadow-2xl max-w-md">
            <AlertDialogHeader className="space-y-3">
              <div className="size-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/25">
                <AlertTriangle className="size-6" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-foreground">
                Substituir e Resetar Container?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
                <span>
                  Este container está atualmente configurado com <strong className="text-foreground font-semibold">"{app?.name}"</strong>.
                </span>
                <span className="block">
                  Fazer deploy a partir deste repositório Git irá <strong className="text-rose-500 font-semibold">resetar o container atual, remover os arquivos do serviço anterior</strong> e implantar o novo código-fonte de:
                </span>
                <code className="block p-2.5 rounded-xl bg-muted font-mono text-[11px] text-foreground truncate border">
                  {gitRepoInput} ({gitBranchInput || "main"})
                </code>
                <span className="block text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Caso possua alterações ou dados importantes não salvos, certifique-se de salvar antes de prosseguir.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-5 gap-2 sm:gap-0">
              <AlertDialogCancel className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setIsGitDeployConfirmOpen(false);
                  deployGitMutation.mutate({
                    gitRepository: gitRepoInput.trim(),
                    gitBranch: gitBranchInput.trim() || "main",
                  });
                }}
                className="rounded-xl h-10 px-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                Sim, Resetar e Fazer Deploy
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
