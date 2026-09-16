import React from "react";
import { UptimeMonitoringSection } from "../UptimeMonitoringSection";
import {
  AppPendingDeployBanner,
  AppPendingEnvsAlert,
  AppMetricsCards,
  AppAccessGuideCard,
  AppConnectionEndpointsCard,
  AppInfrastructureInfoCard,
} from "../overview";

export interface AppOverviewTabProps {
  app: any;
  appId: string;
  isPendingDeploy: boolean;
  pendingEnvs: any[];
  isRunning: boolean;
  metrics: any;
  safeOnlineUrl: string;
  setIsTemplateModalOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  copyToClipboard: (text: string, key?: string | undefined) => void;
  navigate: any;
  envsData?: any[] | undefined;
}

export function AppOverviewTab({
  app,
  appId,
  isPendingDeploy,
  pendingEnvs,
  isRunning,
  metrics,
  safeOnlineUrl,
  setIsTemplateModalOpen,
  setActiveTab,
  copyToClipboard,
  navigate,
  envsData,
}: AppOverviewTabProps) {
  return (
    <div className="space-y-6">
      {isPendingDeploy ? (
        <AppPendingDeployBanner
          app={app}
          setIsTemplateModalOpen={setIsTemplateModalOpen}
          setActiveTab={setActiveTab}
        />
      ) : (
        <div className="space-y-6">
          {/* Alerta de credenciais obrigatórias pendentes */}
          <AppPendingEnvsAlert
            pendingEnvs={pendingEnvs}
            setActiveTab={setActiveTab}
          />

          {/* Cards de Métricas e Alertas de Hardware */}
          <AppMetricsCards
            app={app}
            isRunning={isRunning}
            metrics={metrics}
            navigate={navigate}
          />

          {/* Gráfico e Histórico de Recursos & Uptime */}
          <UptimeMonitoringSection
            appId={appId}
            appName={app.name}
            fqdn={app.fqdn}
            status={app.status}
            createdAt={app.created_at}
            updatedAt={app.updated_at || app.created_at || new Date().toISOString()}
            metrics={metrics}
          />

          {/* Guia de Acesso Inteligente & Credenciais de Administrador */}
          <AppAccessGuideCard
            app={app}
            safeOnlineUrl={safeOnlineUrl}
            envsData={envsData}
            setActiveTab={setActiveTab}
            copyToClipboard={copyToClipboard}
          />

          {/* Portas, Conexões e Endpoints Públicos */}
          <AppConnectionEndpointsCard
            app={app}
            safeOnlineUrl={safeOnlineUrl}
            pendingEnvs={pendingEnvs}
            setActiveTab={setActiveTab}
            copyToClipboard={copyToClipboard}
          />

          {/* Informações da Infraestrutura */}
          <AppInfrastructureInfoCard
            app={app}
            metrics={metrics}
          />
        </div>
      )}
    </div>
  );
}
