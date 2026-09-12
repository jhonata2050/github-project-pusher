import React from "react";
import {
  Cpu,
  Sparkles,
  Zap,
  FolderArchive,
  Upload,
  GitBranch,
  KeyRound,
  AlertTriangle,
  Activity,
  HardDrive,
  Wifi,
  Database,
  Globe,
  Copy,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UptimeMonitoringSection } from "../UptimeMonitoringSection";
import { extractAppHash12, calculateDatabasePort } from "@/lib/app-subdomain";

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
  copyToClipboard: (text: string, key?: string) => void;
  navigate: any;
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
}: AppOverviewTabProps) {
  return (
    <div className="space-y-6">
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

          {/* GRÁFICO E HISTÓRICO DE RECURSOS & UPTIME */}
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
    </div>
  );
}
