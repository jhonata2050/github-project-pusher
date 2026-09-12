import React from "react";
import { AlertTriangle, Zap, Cpu, Activity, HardDrive, Wifi } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export interface AppMetricsCardsProps {
  app: any;
  isRunning: boolean;
  metrics: any;
  navigate: any;
}

export function AppMetricsCards({
  app,
  isRunning,
  metrics,
  navigate,
}: AppMetricsCardsProps) {
  return (
    <div className="space-y-4">
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

      {/* 4 Cards de Hardware */}
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
    </div>
  );
}
