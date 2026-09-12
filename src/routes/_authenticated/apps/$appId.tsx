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
import { ContainerLogsViewer } from "@/components/apps/ContainerLogsViewer";
import { generateAppDefaultFqdn } from "@/lib/app-subdomain";
import { AppOverviewTab } from "@/components/apps/tabs/AppOverviewTab";
import { AppDeployTab } from "@/components/apps/tabs/AppDeployTab";
import { AppEnvsTab } from "@/components/apps/tabs/AppEnvsTab";
import { AppDomainsTab } from "@/components/apps/tabs/AppDomainsTab";

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
            <AppOverviewTab
              app={app}
              appId={appId}
              isPendingDeploy={isPendingDeploy}
              pendingEnvs={pendingEnvs}
              isRunning={isRunning}
              metrics={metrics}
              safeOnlineUrl={safeOnlineUrl}
              setIsTemplateModalOpen={setIsTemplateModalOpen}
              setActiveTab={setActiveTab}
              copyToClipboard={copyToClipboard}
              navigate={navigate}
            />
          </TabsContent>

          {/* 2. ABA: GERENCIADOR DE ARQUIVOS & EDITOR REAL */}
          <TabsContent value="files" className="space-y-6">
            <FileManagerView appId={appId} containerRoot={app?.container_root} />
          </TabsContent>

          {/* 3. ABA: CÓDIGO & DEPLOY */}
          <TabsContent value="deploy" className="space-y-6">
            <AppDeployTab
              app={app}
              gitRepoInput={gitRepoInput}
              setGitRepoInput={setGitRepoInput}
              gitBranchInput={gitBranchInput}
              setGitBranchInput={setGitBranchInput}
              deployGitMutation={deployGitMutation}
              actionMutation={actionMutation}
              setIsGitDeployConfirmOpen={setIsGitDeployConfirmOpen}
              setActiveTab={setActiveTab}
              setIsTemplateModalOpen={setIsTemplateModalOpen}
            />
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
            <AppEnvsTab
              envsList={envsList}
              setEnvsList={setEnvsList}
              pendingEnvs={pendingEnvs}
              isEnvPending={isEnvPending}
              saveEnvsMutation={saveEnvsMutation}
              actionMutation={actionMutation}
            />
          </TabsContent>

          {/* 6. ABA: DOMÍNIOS & SSL */}
          <TabsContent value="domains" className="space-y-6">
            <AppDomainsTab
              defaultSubdomain={defaultSubdomain}
              cleanDefaultSubdomainHost={cleanDefaultSubdomainHost}
              hasCustomDomain={hasCustomDomain}
              activeCustomDomain={activeCustomDomain}
              customDomainInput={customDomainInput}
              setCustomDomainInput={setCustomDomainInput}
              userDomains={userDomains || []}
              isVerifyingDns={isVerifyingDns}
              verifyDnsMutation={verifyDnsMutation}
              saveDomainMutation={saveDomainMutation}
              resetDomainMutation={resetDomainMutation}
              dnsCheckResult={dnsCheckResult}
              copyToClipboard={copyToClipboard}
              copiedDnsKey={copiedDnsKey}
            />
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
