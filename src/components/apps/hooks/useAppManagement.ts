import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  getApplicationDetails,
  getApplicationLogs,
  getApplicationEnvs,
} from "@/lib/cloud-apps.functions";
import { getMyDomains } from "@/lib/domains.functions";
import { detectPendingRequiredEnvs } from "./env-helpers";
import { useAppModals } from "./useAppModals";
import { useAppDeployTracker } from "./useAppDeployTracker";
import { useAppDomain } from "./useAppDomain";
import { useAppOperations } from "./useAppOperations";
import type { UseAppManagementOptions, AppMetricsSummary } from "./types";

export { detectPendingRequiredEnvs };
export type { UseAppManagementOptions };

export function useAppManagement({ appId }: UseAppManagementOptions) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // 1. Consulta de detalhes da aplicação
  const { data: app, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["applicationDetails", appId],
    queryFn: () => getApplicationDetails({ data: { appId } }),
    refetchInterval: activeTab === "overview" ? 12000 : 30000,
  });

  // 2. Consulta de logs em tempo real
  const { data: logsData, isFetching: isFetchingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["applicationLogs", appId],
    queryFn: () => getApplicationLogs({ data: { appId } }),
    enabled: Boolean(appId) && (activeTab === "logs" || activeTab === "terminal"),
    refetchInterval: (activeTab === "logs" || activeTab === "terminal") ? 5000 : false,
  });

  // 3. Consulta de variáveis de ambiente
  const { data: envsData } = useQuery({
    queryKey: ["applicationEnvs", appId],
    queryFn: () => getApplicationEnvs({ data: { appId } }),
    enabled: Boolean(appId) && (activeTab === "envs" || activeTab === "settings"),
  });

  // 4. Consulta de domínios da conta
  const { data: userDomains } = useQuery({
    queryKey: ["userDomains"],
    queryFn: () => getMyDomains(),
    staleTime: 60000,
  });

  // 5. Sub-hook de Modais e Diálogos
  const modals = useAppModals(app?.name);

  // 6. Sub-hook de Monitoramento de Deploy ao Vivo
  const tracker = useAppDeployTracker({
    appId,
    refetchApp: refetch,
    refetchLogs,
  });

  // 7. Sub-hook de Domínio e DNS
  const domain = useAppDomain({
    appId,
    app,
    refetchApp: refetch,
  });

  // 8. Sub-hook de Operações e Mutações
  const operations = useAppOperations({
    appId,
    app,
    envsData,
    refetchApp: refetch,
    refetchLogs,
    setIsStopAppConfirmOpen: modals.setIsStopAppConfirmOpen,
    setIsEditingName: modals.setIsEditingName,
    setIsDeployModalOpen: tracker.setIsDeployModalOpen,
    setIsTemplateModalOpen: modals.setIsTemplateModalOpen,
    setActiveDeploymentUuid: tracker.setActiveDeploymentUuid,
    setDeploymentStatus: tracker.setDeploymentStatus,
    setDeploymentLogs: tracker.setDeploymentLogs,
    setDeployStep: tracker.setDeployStep,
    setDeployAppTitle: tracker.setDeployAppTitle,
  });

  // Detecção de variáveis pendentes
  const currentEnvs = operations.envsList.length > 0 ? operations.envsList : (envsData || (app as any)?.env_vars || []);
  const pendingEnvs = detectPendingRequiredEnvs(currentEnvs);
  const isEnvPending = (env: { key: string; value: string }) => detectPendingRequiredEnvs([env]).length > 0;

  const isRunning = app?.status === "running";
  const isPendingDeploy = (app?.status as string) === "pending_deploy" || app?.status === "provisioning" || (!app?.template_id && !app?.git_repository);

  const metrics: AppMetricsSummary = {
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
    isStopAppConfirmOpen: modals.isStopAppConfirmOpen,
    setIsStopAppConfirmOpen: modals.setIsStopAppConfirmOpen,
    isGitDeployConfirmOpen: modals.isGitDeployConfirmOpen,
    setIsGitDeployConfirmOpen: modals.setIsGitDeployConfirmOpen,
    gitRepoInput: operations.gitRepoInput,
    setGitRepoInput: operations.setGitRepoInput,
    gitBranchInput: operations.gitBranchInput,
    setGitBranchInput: operations.setGitBranchInput,
    customDomainInput: domain.customDomainInput,
    setCustomDomainInput: domain.setCustomDomainInput,
    envsList: operations.envsList,
    setEnvsList: operations.setEnvsList,
    isTemplateModalOpen: modals.isTemplateModalOpen,
    setIsTemplateModalOpen: modals.setIsTemplateModalOpen,
    isDeployModalOpen: tracker.isDeployModalOpen,
    setIsDeployModalOpen: tracker.setIsDeployModalOpen,
    activeDeploymentUuid: tracker.activeDeploymentUuid,
    deploymentStatus: tracker.deploymentStatus,
    deploymentLogs: tracker.deploymentLogs,
    deployStep: tracker.deployStep,
    deployAppTitle: tracker.deployAppTitle,
    terminalLogsEndRef: tracker.terminalLogsEndRef,
    isEditingName: modals.isEditingName,
    setIsEditingName: modals.setIsEditingName,
    editingNameInput: modals.editingNameInput,
    setEditingNameInput: modals.setEditingNameInput,
    logsData,
    isFetchingLogs,
    refetchLogs,
    envsData,
    userDomains,
    dnsCheckResult: domain.dnsCheckResult,
    isVerifyingDns: domain.isVerifyingDns,
    copiedDnsKey: domain.copiedDnsKey,
    copyToClipboard: domain.copyToClipboard,
    defaultSubdomain: domain.defaultSubdomain,
    cleanDefaultSubdomainHost: domain.cleanDefaultSubdomainHost,
    safeOnlineUrl: domain.safeOnlineUrl,
    hasCustomDomain: domain.hasCustomDomain,
    activeCustomDomain: domain.activeCustomDomain,
    pendingEnvs,
    isEnvPending,
    isRunning,
    isPendingDeploy,
    metrics,
    actionMutation: operations.actionMutation,
    resetMutation: operations.resetMutation,
    deployGitMutation: operations.deployGitMutation,
    updateNameMutation: operations.updateNameMutation,
    saveEnvsMutation: operations.saveEnvsMutation,
    applyTemplateMutation: operations.applyTemplateMutation,
    saveDomainMutation: domain.saveDomainMutation,
    resetDomainMutation: domain.resetDomainMutation,
    verifyDnsMutation: domain.verifyDnsMutation,
  };
}
