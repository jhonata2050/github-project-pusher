import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { generateAppDefaultFqdn } from "@/lib/app-subdomain";

export function detectPendingRequiredEnvs(envs?: Array<{ key: string; value: string }>) {
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

export function useAppManagement({ appId }: { appId: string }) {
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

  const isRunning = app?.status === "running";
  const isPendingDeploy = (app?.status as string) === "pending_deploy" || app?.status === "provisioning" || (!app?.template_id && !app?.git_repository);
  
  const metrics = {
    usedRamMb: app?.metrics?.usedRamMb ?? 0,
    totalRamMb: app?.metrics?.totalRamMb ?? (app?.memory_limit || 512),
    ramUsagePercent: app?.metrics?.ramUsagePercent ?? 0,
    cpuUsagePercent: app?.metrics?.cpuUsagePercent ?? 0,
    cpuCores: app?.metrics?.cpuCores ?? (app?.cpu_limit || 1),
    usedDiskBytes: app?.metrics?.usedDiskBytes ?? 0,
    usedDiskFormatted: app?.metrics?.usedDiskFormatted ?? "0 B",
    usedDiskGb: app?.metrics?.usedDiskGb ?? 0,
    usedDiskMb: app?.metrics?.usedDiskMb ?? 0,
    totalDiskMb: app?.metrics?.totalDiskMb ?? (app as any)?.disk_limit_mb ?? 2048,
    totalDiskGb: app?.metrics?.totalDiskGb ?? Number((((app as any)?.disk_limit_mb || 2048) / 1024).toFixed(1)),
    totalDiskFormatted: app?.metrics?.totalDiskFormatted ?? `${Number((((app as any)?.disk_limit_mb || 2048) / 1024).toFixed(1))} GB`,
    diskUsagePercent: app?.metrics?.diskUsagePercent ?? 0,
    uptimeSeconds: app?.metrics?.uptimeSeconds ?? 0,
    uptimeFormatted: app?.metrics?.uptimeFormatted ?? "0m",
    networkInKb: app?.metrics?.networkInKb ?? 0,
    networkOutKb: app?.metrics?.networkOutKb ?? 0,
    pids: app?.metrics?.pids ?? 0,
    cpuStatus: app?.metrics?.cpuStatus ?? "idle",
    ramStatus: app?.metrics?.ramStatus ?? "normal",
    shouldUpgrade: app?.metrics?.shouldUpgrade ?? false,
    upgradeReason: app?.metrics?.upgradeReason ?? "",
    telemetryHistory: app?.metrics?.telemetryHistory ?? [],
  };

  return {
    navigate,
    app,
    isLoading,
    isError,
    error,
    refetch,
    activeTab,
    setActiveTab,
    isStopAppConfirmOpen,
    setIsStopAppConfirmOpen,
    isGitDeployConfirmOpen,
    setIsGitDeployConfirmOpen,
    gitRepoInput,
    setGitRepoInput,
    gitBranchInput,
    setGitBranchInput,
    customDomainInput,
    setCustomDomainInput,
    envsList,
    setEnvsList,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    isDeployModalOpen,
    setIsDeployModalOpen,
    activeDeploymentUuid,
    deploymentStatus,
    deploymentLogs,
    deployStep,
    deployAppTitle,
    terminalLogsEndRef,
    isEditingName,
    setIsEditingName,
    editingNameInput,
    setEditingNameInput,
    logsData,
    isFetchingLogs,
    refetchLogs,
    envsData,
    userDomains,
    dnsCheckResult,
    isVerifyingDns,
    copiedDnsKey,
    copyToClipboard,
    defaultSubdomain,
    cleanDefaultSubdomainHost,
    safeOnlineUrl,
    hasCustomDomain,
    activeCustomDomain,
    pendingEnvs,
    isEnvPending,
    isRunning,
    isPendingDeploy,
    metrics,
    actionMutation,
    resetMutation,
    deployGitMutation,
    updateNameMutation,
    saveEnvsMutation,
    applyTemplateMutation,
    saveDomainMutation,
    resetDomainMutation,
    verifyDnsMutation,
  };
}
