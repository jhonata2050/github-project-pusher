import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Square, 
  RotateCcw, 
  ExternalLink, 
  Terminal, 
  GitBranch, 
  Globe, 
  ArrowLeft, 
  Activity, 
  Trash2, 
  Copy, 
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  Code2,
  KeyRound,
  Pencil,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
import { 
  getApplicationDetails, 
  executeAppAction,
  getApplicationLogs, 
  getApplicationEnvs, 
  saveApplicationEnvs,
  updateApplicationDomain,
  resetApplicationDomain,
  verifyApplicationDomainDns,
  applyTemplateToApp,
  getDeploymentStatus,
  updateApplicationName,
  deployApplicationFromGit,
  resetCloudApp
} from "@/lib/cloud-apps.functions";
import { getMyDomains } from "@/lib/domains.functions";
import { type AppTemplate, getRequiredDiskWithMargin } from "@/lib/templates.data";
import { toast } from "sonner";
import { FileManagerView } from "@/components/file-manager/FileManagerView";
import { ContainerLogsViewer } from "@/components/apps/ContainerLogsViewer";
import { generateAppDefaultFqdn } from "@/lib/app-subdomain";
import { AppOverviewTab } from "@/components/apps/tabs/AppOverviewTab";
import { AppDeployTab } from "@/components/apps/tabs/AppDeployTab";
import { AppEnvsTab } from "@/components/apps/tabs/AppEnvsTab";
import { AppDomainsTab } from "@/components/apps/tabs/AppDomainsTab";
import { AppTemplateCatalogModal } from "@/components/apps/modals/AppTemplateCatalogModal";
import { AppLiveDeployModal } from "@/components/apps/modals/AppLiveDeployModal";

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

  // Estados para o Catálogo de Templates 1-Clique
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

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
        const res = await getDeploymentStatus({ data: { appId, deploymentUuid: activeDeploymentUuid } });
        if (res) {
          if (res.status === "finished") {
            setDeploymentStatus("finished");
            setDeployStep(4);
            toast.success("🚀 Aplicação implantada e online com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
            queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
            refetch();
            refetchLogs();
          } else if (res.status === "failed") {
            setDeploymentStatus("failed");
            toast.error("❌ Falha na implantação da aplicação. Verifique os logs.");
          } else {
            setDeploymentStatus("in_progress");
            if (res.step) setDeployStep(res.step);
          }

          if (res.logs && Array.isArray(res.logs)) {
            setDeploymentLogs(res.logs);
          }
        }
      } catch (e) {
        console.error("Erro ao consultar status do deploy:", e);
      }
    }, 2000);

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
            queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
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
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      refetch();
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
          queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
          queryClient.invalidateQueries({ queryKey: ["myApplications"] });
          refetch();
        }, 3000);
      }
      toast.success("Deploy do repositório Git realizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      refetch();
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

        {/* Modal de Catálogo de Templates 1-Clique */}
        <AppTemplateCatalogModal
          open={isTemplateModalOpen}
          onOpenChange={setIsTemplateModalOpen}
          app={app}
          applyTemplateMutation={applyTemplateMutation}
        />

        {/* Modal de Deploy em Tempo Real & Live Terminal */}
        <AppLiveDeployModal
          open={isDeployModalOpen}
          onOpenChange={setIsDeployModalOpen}
          deployAppTitle={deployAppTitle}
          appName={app.name}
          deploymentStatus={deploymentStatus || "idle"}
          deployStep={deployStep}
          memoryLimit={app.memory_limit}
          deploymentLogs={deploymentLogs as any}
          terminalLogsEndRef={terminalLogsEndRef}
          safeOnlineUrl={safeOnlineUrl}
        />

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
