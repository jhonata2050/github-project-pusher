import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Terminal, 
  GitBranch, 
  Globe, 
  Activity, 
  RefreshCw,
  Sparkles,
  Code2,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileManagerView } from "@/components/file-manager/FileManagerView";
import { ContainerLogsViewer } from "@/components/apps/ContainerLogsViewer";
import { AppOverviewTab } from "@/components/apps/tabs/AppOverviewTab";
import { AppDeployTab } from "@/components/apps/tabs/AppDeployTab";
import { AppEnvsTab } from "@/components/apps/tabs/AppEnvsTab";
import { AppDomainsTab } from "@/components/apps/tabs/AppDomainsTab";
import { AppTemplateCatalogModal } from "@/components/apps/modals/AppTemplateCatalogModal";
import { AppLiveDeployModal } from "@/components/apps/modals/AppLiveDeployModal";
import { AppHeader } from "@/components/apps/AppHeader";
import { AppStopConfirmModal } from "@/components/apps/modals/AppStopConfirmModal";
import { AppGitDeployConfirmModal } from "@/components/apps/modals/AppGitDeployConfirmModal";
import { useAppManagement } from "@/components/apps/hooks/useAppManagement";

export const Route = createFileRoute("/_authenticated/apps/$appId")({
  head: () => ({
    meta: [{ title: "Gerenciar Aplicação — Eqsam PaaS" }],
  }),
  component: AppDetailsPage,
});

function AppDetailsPage() {
  const { appId } = Route.useParams();
  const m = useAppManagement({ appId });

  if (m.isLoading) {
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

  const app = m.app;

  if (m.isError || !app) {
    return (
      <AppShell breadcrumb="Aplicação não encontrada">
        <div className="max-w-md mx-auto my-16 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Aplicação não encontrada</h2>
          <p className="text-sm text-muted-foreground">
            {(m.error as any)?.message || "Não foi possível carregar os detalhes do container."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => m.refetch()} className="rounded-xl gap-2">
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

  const getStatusBadge = () => {
    if (m.isPendingDeploy) {
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
        <AppHeader
          app={app}
          isEditingName={m.isEditingName}
          setIsEditingName={m.setIsEditingName}
          editingNameInput={m.editingNameInput}
          setEditingNameInput={m.setEditingNameInput}
          onSaveName={(name) => m.updateNameMutation.mutate(name)}
          isSavingName={m.updateNameMutation.isPending}
          getStatusBadge={getStatusBadge}
          isPendingDeploy={m.isPendingDeploy}
          hasCustomDomain={m.hasCustomDomain}
          activeCustomDomain={m.activeCustomDomain}
          cleanDefaultSubdomainHost={m.cleanDefaultSubdomainHost}
          safeOnlineUrl={m.safeOnlineUrl}
          copyToClipboard={m.copyToClipboard}
          onOpenTemplateModal={() => m.setIsTemplateModalOpen(true)}
          isRunning={m.isRunning}
          isActionPending={m.actionMutation.isPending}
          onAction={(action) => m.actionMutation.mutate(action)}
          onOpenDeleteConfirm={() => m.setIsStopAppConfirmOpen(true)}
        />

        {/* Abas do Painel */}
        <Tabs value={m.activeTab} onValueChange={m.setActiveTab} className="space-y-6">
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
              {m.pendingEnvs.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                  {m.pendingEnvs.length}
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
              isPendingDeploy={m.isPendingDeploy}
              pendingEnvs={m.pendingEnvs}
              isRunning={m.isRunning}
              metrics={m.metrics}
              safeOnlineUrl={m.safeOnlineUrl}
              setIsTemplateModalOpen={m.setIsTemplateModalOpen}
              setActiveTab={m.setActiveTab}
              copyToClipboard={m.copyToClipboard}
              navigate={m.navigate}
            />
          </TabsContent>

          {/* 2. ABA: GERENCIADOR DE ARQUIVOS & EDITOR REAL */}
          <TabsContent value="files" className="space-y-6">
            <FileManagerView appId={appId} containerRoot={app.container_root} />
          </TabsContent>

          {/* 3. ABA: CÓDIGO & DEPLOY */}
          <TabsContent value="deploy" className="space-y-6">
            <AppDeployTab
              app={app}
              gitRepoInput={m.gitRepoInput}
              setGitRepoInput={m.setGitRepoInput}
              gitBranchInput={m.gitBranchInput}
              setGitBranchInput={m.setGitBranchInput}
              deployGitMutation={m.deployGitMutation}
              actionMutation={m.actionMutation}
              setIsGitDeployConfirmOpen={m.setIsGitDeployConfirmOpen}
              setActiveTab={m.setActiveTab}
              setIsTemplateModalOpen={m.setIsTemplateModalOpen}
            />
          </TabsContent>

          {/* 4. ABA: TERMINAL DE LOGS */}
          <TabsContent value="logs" className="space-y-4">
            <ContainerLogsViewer
              logs={m.logsData || ""}
              appName={app.name}
              buildPack={app.build_pack}
              isLoading={m.isFetchingLogs}
              onRefresh={() => m.refetchLogs()}
            />
          </TabsContent>

          {/* 5. ABA: VARIÁVEIS DE AMBIENTE (.ENV) */}
          <TabsContent value="envs" className="space-y-6">
            <AppEnvsTab
              envsList={m.envsList}
              setEnvsList={m.setEnvsList}
              pendingEnvs={m.pendingEnvs}
              isEnvPending={m.isEnvPending}
              saveEnvsMutation={m.saveEnvsMutation}
              actionMutation={m.actionMutation}
            />
          </TabsContent>

          {/* 6. ABA: DOMÍNIOS & SSL */}
          <TabsContent value="domains" className="space-y-6">
            <AppDomainsTab
              defaultSubdomain={m.defaultSubdomain}
              cleanDefaultSubdomainHost={m.cleanDefaultSubdomainHost}
              hasCustomDomain={m.hasCustomDomain}
              activeCustomDomain={m.activeCustomDomain}
              customDomainInput={m.customDomainInput}
              setCustomDomainInput={m.setCustomDomainInput}
              userDomains={m.userDomains || []}
              isVerifyingDns={m.isVerifyingDns}
              verifyDnsMutation={m.verifyDnsMutation}
              saveDomainMutation={m.saveDomainMutation}
              resetDomainMutation={m.resetDomainMutation}
              dnsCheckResult={m.dnsCheckResult}
              copyToClipboard={m.copyToClipboard}
              copiedDnsKey={m.copiedDnsKey}
            />
          </TabsContent>
        </Tabs>

        {/* Modal de Catálogo de Templates 1-Clique */}
        <AppTemplateCatalogModal
          open={m.isTemplateModalOpen}
          onOpenChange={m.setIsTemplateModalOpen}
          app={app}
          applyTemplateMutation={m.applyTemplateMutation}
        />

        {/* Modal de Deploy em Tempo Real & Live Terminal */}
        <AppLiveDeployModal
          open={m.isDeployModalOpen}
          onOpenChange={m.setIsDeployModalOpen}
          deployAppTitle={m.deployAppTitle}
          appName={app.name}
          deploymentStatus={m.deploymentStatus || "idle"}
          deployStep={m.deployStep}
          memoryLimit={app.memory_limit}
          deploymentLogs={m.deploymentLogs as any}
          terminalLogsEndRef={m.terminalLogsEndRef}
          safeOnlineUrl={m.safeOnlineUrl}
        />

        {/* Modal de Confirmação para Reset Total / Exclusão do Serviço e Limpeza do Container */}
        <AppStopConfirmModal
          open={m.isStopAppConfirmOpen}
          onOpenChange={m.setIsStopAppConfirmOpen}
          appName={app.name}
          onConfirm={() => m.resetMutation.mutate()}
          isPending={m.resetMutation.isPending}
        />

        {/* Modal de Confirmação para Deploy de Git (Reset do Container Existente) */}
        <AppGitDeployConfirmModal
          open={m.isGitDeployConfirmOpen}
          onOpenChange={m.setIsGitDeployConfirmOpen}
          appName={app.name}
          gitRepoInput={m.gitRepoInput}
          gitBranchInput={m.gitBranchInput}
          onConfirm={() => {
            m.setIsGitDeployConfirmOpen(false);
            m.deployGitMutation.mutate({
              gitRepository: m.gitRepoInput.trim(),
              gitBranch: m.gitBranchInput.trim() || "main",
            });
          }}
        />
      </div>
    </AppShell>
  );
}
