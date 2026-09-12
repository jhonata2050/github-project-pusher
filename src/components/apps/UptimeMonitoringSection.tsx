import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Activity,
  Cpu,
  Layers,
  HardDrive,
  Server,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UptimePeriod,
  MetricFilter,
  UptimeMonitoringSectionProps,
  buildRealResourceTimeline,
  computeResourceSummary,
  extractContainerEvents,
  UptimeChart,
  UptimeEventList,
} from "./uptime";

export type { UptimePeriod, MetricFilter, UptimeMonitoringSectionProps };
export { buildRealResourceTimeline };

export function UptimeMonitoringSection({
  appId,
  appName = "Aplicação",
  fqdn,
  status = "running",
  createdAt,
  updatedAt,
  metrics,
}: UptimeMonitoringSectionProps) {
  const [period, setPeriod] = useState<UptimePeriod>("1h");
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all");

  const isRunning = status === "running";

  const totalRam = metrics?.totalRamMb || 512;
  const currentRamMb = metrics?.usedRamMb ?? 0;
  const currentCpu = metrics?.cpuUsagePercent ?? 0;
  const totalDisk = metrics?.totalDiskGb || 2;
  const currentDiskGb = metrics?.usedDiskGb ?? 0;
  const usedDiskFormatted = metrics?.usedDiskFormatted || (currentDiskGb > 0 ? `${currentDiskGb} GB` : "0 B");
  const uptimeSeconds = metrics?.uptimeSeconds ?? 0;

  const data = useMemo(
    () =>
      buildRealResourceTimeline(
        period,
        currentCpu,
        totalRam,
        currentRamMb,
        totalDisk,
        currentDiskGb,
        usedDiskFormatted,
        isRunning,
        uptimeSeconds,
        createdAt,
        metrics?.telemetryHistory || []
      ),
    [
      period,
      currentCpu,
      totalRam,
      currentRamMb,
      totalDisk,
      currentDiskGb,
      usedDiskFormatted,
      isRunning,
      uptimeSeconds,
      createdAt,
      metrics?.telemetryHistory,
    ]
  );

  const summary = useMemo(
    () =>
      computeResourceSummary(
        data,
        currentDiskGb,
        totalRam,
        totalDisk,
        isRunning,
        metrics?.diskUsagePercent,
        metrics?.telemetryHistory
      ),
    [data, totalRam, totalDisk, currentDiskGb, isRunning, metrics?.diskUsagePercent, metrics?.telemetryHistory]
  );

  const events = useMemo(
    () =>
      extractContainerEvents({
        createdAt,
        updatedAt,
        isRunning,
        uptimeSeconds,
        uptimeFormatted: metrics?.uptimeFormatted,
        telemetryHistory: metrics?.telemetryHistory,
      }),
    [createdAt, updatedAt, isRunning, uptimeSeconds, metrics?.uptimeFormatted, metrics?.telemetryHistory]
  );

  return (
    <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">Uptime & Desempenho do Container</CardTitle>
                {isRunning ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono px-2 py-0 gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online • Uptime: {metrics?.uptimeFormatted || "Ativo"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-zinc-500/10 text-zinc-500 border-zinc-500/30 text-[10px] font-mono px-2 py-0 gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                    Container Parado
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Métricas e eventos em tempo real coletados do nó DK1 (sem dados sintéticos)
              </p>
            </div>
          </div>

          {/* Seletor de Período 1h, 24h, 7d, 30d */}
          <div className="flex items-center gap-1 p-0.5 bg-muted/70 rounded-xl border text-xs font-semibold self-start sm:self-auto shrink-0">
            {(["1h", "24h", "7d", "30d"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "default" : "ghost"}
                onClick={() => setPeriod(p)}
                className={`rounded-lg h-7 px-2.5 text-xs font-bold transition-all ${
                  period === p
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "1h" ? "1 Hora" : p === "24h" ? "24 Horas" : p === "7d" ? "7 Dias" : "30 Dias"}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Filtro de Métrica + Sumário de Recursos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          {/* Abas de Métrica (CPU & RAM, CPU, RAM, HD) */}
          <div className="flex items-center gap-1 p-0.5 bg-muted/40 rounded-xl border text-xs font-medium self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMetricFilter("all")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                metricFilter === "all"
                  ? "bg-background text-foreground shadow-xs border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="h-3 w-3 text-purple-500" /> CPU & RAM (%)
            </button>
            <button
              type="button"
              onClick={() => setMetricFilter("cpu")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                metricFilter === "cpu"
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-xs border border-purple-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu className="h-3 w-3 text-purple-500" /> CPU (%)
            </button>
            <button
              type="button"
              onClick={() => setMetricFilter("ram")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                metricFilter === "ram"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3 w-3 text-emerald-500" /> RAM (MB)
            </button>
            <button
              type="button"
              onClick={() => setMetricFilter("hd")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                metricFilter === "hd"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-xs border border-blue-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HardDrive className="h-3 w-3 text-blue-500" /> Disco (HD)
            </button>
          </div>

          {/* Mini Indicadores de Média */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span>CPU: <strong className="text-foreground">{currentCpu}%</strong> (pico {summary.maxCpu}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>RAM: <strong className="text-foreground">{currentRamMb} MB</strong> ({totalRam > 0 ? Math.round((currentRamMb / totalRam) * 100) : 0}%)</span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>HD: <strong className="text-foreground">{metrics?.usedDiskFormatted || `${summary.diskGb} GB`}</strong> ({metrics?.diskUsagePercent ?? summary.diskPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Gráfico Recharts de Alta Precisão */}
        <UptimeChart
          data={data}
          metricFilter={metricFilter}
          totalRam={totalRam}
          totalDisk={totalDisk}
          metricsTotalDiskFormatted={metrics?.totalDiskFormatted}
        />

        {/* Rodapé com Legenda dos Canais */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t text-[11px] text-muted-foreground font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" /> CPU (%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> RAM ({totalRam}MB)
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-zinc-400" /> Histórico Operacional
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Server className="h-3 w-3 text-primary" />
            <span>DK1.EQSAM.COM • Coleta Contínua Swarm</span>
          </div>
        </div>

        {/* Linha do Tempo de Eventos Reais do Container */}
        <UptimeEventList events={events} />
      </CardContent>
    </Card>
  );
}
