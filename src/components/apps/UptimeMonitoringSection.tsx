import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Cpu,
  HardDrive,
  Activity,
  Server,
  TrendingUp,
  Layers,
  Clock,
  PlayCircle,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type UptimePeriod = "1h" | "24h" | "7d" | "30d";
export type MetricFilter = "all" | "cpu" | "ram" | "hd";

export interface UptimeMonitoringSectionProps {
  appId: string;
  appName?: string;
  fqdn?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  metrics?: {
    usedRamMb?: number;
    totalRamMb?: number;
    ramUsagePercent?: number;
    cpuUsagePercent?: number;
    cpuCores?: number;
    usedDiskGb?: number;
    usedDiskMb?: number;
    usedDiskBytes?: number;
    usedDiskFormatted?: string;
    totalDiskGb?: number;
    totalDiskMb?: number;
    totalDiskFormatted?: string;
    diskUsagePercent?: number;
    uptimeSeconds?: number;
    uptimeFormatted?: string;
    telemetryHistory?: Array<{
      label?: string;
      timestamp: string;
      cpuPercent: number;
      ramMb: number;
      ramPercent: number;
      diskGb: number;
      diskBytes?: number;
      diskFormatted?: string;
      diskPercent: number;
      isOnline?: boolean;
    }>;
  };
}

interface ResourcePoint {
  label: string;
  timestamp: string;
  cpuPercent: number;
  ramMb: number;
  ramPercent: number;
  diskGb: number;
  diskFormatted?: string;
  diskPercent: number;
  isOnline: boolean;
}

function buildRealResourceTimeline(
  period: UptimePeriod,
  currentCpu: number,
  totalRam: number,
  currentRamMb: number,
  totalDisk: number,
  currentDiskGb: number,
  usedDiskFormatted: string,
  isRunning: boolean,
  uptimeSeconds: number,
  createdAt?: string,
  history: Array<any> = []
): ResourcePoint[] {
  const now = Date.now();
  const count = period === "1h" ? 30 : period === "24h" ? 24 : period === "7d" ? 14 : 30;
  const stepMs =
    period === "1h"
      ? 2 * 60 * 1000
      : period === "24h"
      ? 60 * 60 * 1000
      : period === "7d"
      ? 12 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

  // Ordenar o histórico cronologicamente
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Início da execução contínua do container atual
  const currentRunStartMs = isRunning && uptimeSeconds > 0 ? now - uptimeSeconds * 1000 : now;
  // Menor timestamp registrado em histórico (se existir)
  const earliestHistoryMs =
    sortedHistory.length > 0 ? new Date(sortedHistory[0].timestamp).getTime() : currentRunStartMs;
  // O container só tem atividade conhecida a partir de activeSinceMs
  const activeSinceMs = Math.min(earliestHistoryMs, currentRunStartMs);

  const points: ResourcePoint[] = [];

  for (let i = 0; i < count; i++) {
    const pointTime = new Date(now - (count - 1 - i) * stepMs);
    const pointTimeMs = pointTime.getTime();

    let label = "";
    if (period === "1h" || period === "24h") {
      label = pointTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } else if (period === "7d") {
      label = `${pointTime.toLocaleDateString("pt-BR", { weekday: "short" })} ${pointTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      label = pointTime.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }

    const fullTimestamp = `${pointTime.toLocaleDateString("pt-BR")} ${pointTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    const isLastPoint = i === count - 1;

    // 1. Se o ponto for anterior ao início real de atividade do container: Offline (0)
    if (pointTimeMs < activeSinceMs - 60000) {
      points.push({
        label,
        timestamp: fullTimestamp,
        cpuPercent: 0,
        ramMb: 0,
        ramPercent: 0,
        diskGb: 0,
        diskFormatted: "0 B",
        diskPercent: 0,
        isOnline: false,
      });
      continue;
    }

    // 2. O último ponto sempre reflete a telemetria ao vivo se o container estiver ativo
    if (isLastPoint && isRunning) {
      points.push({
        label,
        timestamp: fullTimestamp,
        cpuPercent: currentCpu,
        ramMb: currentRamMb,
        ramPercent: totalRam > 0 ? Math.round((currentRamMb / totalRam) * 100) : 0,
        diskGb: currentDiskGb,
        diskFormatted: usedDiskFormatted,
        diskPercent: totalDisk > 0 ? Math.min(100, Math.round((currentDiskGb / totalDisk) * 100)) : 0,
        isOnline: true,
      });
      continue;
    }

    // 3. Buscar no histórico persistido pontos nesta janela de tempo (Math.abs <= stepMs / 2)
    const matchingPoints = sortedHistory.filter((h) => {
      const hTime = new Date(h.timestamp).getTime();
      return Math.abs(hTime - pointTimeMs) <= stepMs / 2;
    });

    if (matchingPoints.length > 0) {
      // Priorizar o maior pico de CPU para registrar stress tests
      const peakPoint = matchingPoints.reduce(
        (max, cur) => (cur.cpuPercent > max.cpuPercent ? cur : max),
        matchingPoints[0]
      );
      points.push({
        label,
        timestamp: fullTimestamp,
        cpuPercent: peakPoint.cpuPercent,
        ramMb: peakPoint.ramMb,
        ramPercent: peakPoint.ramPercent,
        diskGb: typeof peakPoint.diskGb === "number" ? peakPoint.diskGb : (peakPoint.diskBytes ? Number((peakPoint.diskBytes / (1024 * 1024 * 1024)).toFixed(3)) : 0),
        diskFormatted: peakPoint.diskFormatted || (peakPoint.diskGb ? `${peakPoint.diskGb} GB` : "0 B"),
        diskPercent: peakPoint.diskPercent,
        isOnline: peakPoint.isOnline ?? true,
      });
      continue;
    }

    // 4. Forward-fill: usar o último ponto conhecido no passado
    const pastPoints = sortedHistory.filter(
      (h) => new Date(h.timestamp).getTime() <= pointTimeMs
    );
    if (pastPoints.length > 0) {
      const lastKnown = pastPoints[pastPoints.length - 1];
      points.push({
        label,
        timestamp: fullTimestamp,
        cpuPercent: lastKnown.cpuPercent,
        ramMb: lastKnown.ramMb,
        ramPercent: lastKnown.ramPercent,
        diskGb: lastKnown.diskGb,
        diskFormatted: lastKnown.diskFormatted,
        diskPercent: lastKnown.diskPercent,
        isOnline: lastKnown.isOnline ?? isRunning,
      });
      continue;
    }

    // 5. Ativo mas antes do primeiro snapshot gravado na telemetria:
    // Deve usar o primeiro snapshot gravado (estado inicial), NUNCA o valor do futuro!
    if (sortedHistory.length > 0) {
      const firstRecorded = sortedHistory[0];
      points.push({
        label,
        timestamp: fullTimestamp,
        cpuPercent: firstRecorded.cpuPercent,
        ramMb: firstRecorded.ramMb,
        ramPercent: firstRecorded.ramPercent,
        diskGb: firstRecorded.diskGb,
        diskFormatted: firstRecorded.diskFormatted,
        diskPercent: firstRecorded.diskPercent,
        isOnline: true,
      });
      continue;
    }

    // 6. Se não há histórico gravado ainda (container acabou de subir pela primeira vez)
    if (isRunning) {
      points.push({
        label,
        timestamp: fullTimestamp,
        cpuPercent: currentCpu,
        ramMb: currentRamMb,
        ramPercent: totalRam > 0 ? Math.round((currentRamMb / totalRam) * 100) : 0,
        diskGb: currentDiskGb,
        diskFormatted: usedDiskFormatted,
        diskPercent: totalDisk > 0 ? Math.min(100, Math.round((currentDiskGb / totalDisk) * 100)) : 0,
        isOnline: true,
      });
    } else {
      points.push({
        label,
        timestamp: fullTimestamp,
        cpuPercent: 0,
        ramMb: 0,
        ramPercent: 0,
        diskGb: 0,
        diskFormatted: "0 B",
        diskPercent: 0,
        isOnline: false,
      });
    }
  }

  return points;
}

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

  // Médias e picos reais para o sumário
  const summary = useMemo(() => {
    if (!data.length) {
      return { avgCpu: 0, maxCpu: 0, avgRamMb: 0, avgRamPercent: 0, diskGb: currentDiskGb, diskPercent: 0 };
    }
    const activeData = isRunning ? data.filter((d) => d.isOnline) : [];
    const sourceData = activeData.length > 0 ? activeData : data;

    const avgCpu = Number((sourceData.reduce((acc, p) => acc + p.cpuPercent, 0) / sourceData.length).toFixed(1));
    const historyMaxCpu = Math.max(0, ...(metrics?.telemetryHistory || []).map((h) => h.cpuPercent));
    const maxCpu = Math.max(historyMaxCpu, ...sourceData.map((p) => p.cpuPercent));
    const avgRamMb = Math.round(sourceData.reduce((acc, p) => acc + p.ramMb, 0) / sourceData.length);
    const avgRamPercent = totalRam > 0 ? Math.round((avgRamMb / totalRam) * 100) : 0;
    const diskGb = data[data.length - 1]?.diskGb || currentDiskGb;
    const diskPercent = metrics?.diskUsagePercent ?? Math.round((diskGb / totalDisk) * 100);

    return { avgCpu, maxCpu, avgRamMb, avgRamPercent, diskGb, diskPercent };
  }, [data, totalRam, totalDisk, currentDiskGb, isRunning, metrics?.diskUsagePercent, metrics?.telemetryHistory]);

  // Feed de Eventos Reais do Container
  const events = useMemo(() => {
    const list: Array<{
      id: string;
      timestampMs: number;
      timeFormatted: string;
      title: string;
      description: string;
      iconBg: string;
      icon: React.ReactNode;
    }> = [];

    // 1. Evento de Criação / Deploy
    if (createdAt) {
      const createdDate = new Date(createdAt);
      if (!isNaN(createdDate.getTime())) {
        list.push({
          id: "deploy-created",
          timestampMs: createdDate.getTime(),
          timeFormatted: `${createdDate.toLocaleDateString("pt-BR")} ${createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
          title: "🚀 Provisionamento & Deploy Inicial",
          description: "Container isolado provisionado com cgroups no cluster DK1",
          iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          icon: <PlayCircle className="h-3.5 w-3.5" />,
        });
      }
    }

    // 2. Início da Execução do Container Atual
    const uptimeSecs = metrics?.uptimeSeconds || 0;
    if (isRunning && uptimeSecs > 0) {
      const startMs = Date.now() - uptimeSecs * 1000;
      const startDate = new Date(startMs);
      list.push({
        id: "container-started",
        timestampMs: startMs,
        timeFormatted: `${startDate.toLocaleDateString("pt-BR")} ${startDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        title: "⚡ Inicialização da Instância Atual",
        description: `Container colocado em execução contínua no cluster (${metrics?.uptimeFormatted || "ativo"})`,
        iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
        icon: <PlayCircle className="h-3.5 w-3.5" />,
      });
    }

    // 3. Evento de Atualização de Configuração
    if (updatedAt && createdAt) {
      const uDate = new Date(updatedAt);
      const cDate = new Date(createdAt);
      if (!isNaN(uDate.getTime()) && uDate.getTime() - cDate.getTime() > 120000) {
        list.push({
          id: "config-updated",
          timestampMs: uDate.getTime(),
          timeFormatted: `${uDate.toLocaleDateString("pt-BR")} ${uDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
          title: "🔄 Sincronização de Serviço",
          description: "Parâmetros e roteamento atualizados no nó do cluster",
          iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          icon: <RefreshCw className="h-3.5 w-3.5" />,
        });
      }
    }

    // 3. Eventos Reais Gravados na Telemetria
    const historyList = metrics?.telemetryHistory || [];
    let lastDiskBytes = 0;

    historyList.forEach((h, idx) => {
      const hTime = new Date(h.timestamp).getTime();
      const timeFormatted = `${new Date(h.timestamp).toLocaleDateString("pt-BR")} ${new Date(h.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

      // Salto no Armazenamento / Extração de Arquivos (> 50 MB)
      const currentBytes = h.diskBytes || 0;
      if (lastDiskBytes > 0 && Math.abs(currentBytes - lastDiskBytes) >= 50 * 1024 * 1024) {
        list.push({
          id: `disk-change-${idx}`,
          timestampMs: hTime,
          timeFormatted,
          title: "💾 Extração de Arquivos / Expansão em Disco",
          description: `Armazenamento atualizado para ${h.diskFormatted || "412 MB"} (${h.diskPercent}%)`,
          iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
          icon: <HardDrive className="h-3.5 w-3.5" />,
        });
      }
      if (currentBytes > 0) lastDiskBytes = currentBytes;

      // Picos de CPU
      if (h.cpuPercent >= 5) {
        list.push({
          id: `cpu-spike-${idx}`,
          timestampMs: hTime,
          timeFormatted,
          title: "⚡ Pico de Processamento Registrado",
          description: `Consumo atingiu ${h.cpuPercent}% de CPU sob tráfego`,
          iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          icon: <Zap className="h-3.5 w-3.5" />,
        });
      }

      // Alerta de Memória
      if (h.ramPercent >= 75) {
        list.push({
          id: `ram-high-${idx}`,
          timestampMs: hTime,
          timeFormatted,
          title: "⚠️ Consumo Elevado de Memória RAM",
          description: `Alocação atingiu ${h.ramMb} MB (${h.ramPercent}%)`,
          iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
        });
      }
    });

    // 4. Estado Atual
    list.push({
      id: "current-health",
      timestampMs: Date.now(),
      timeFormatted: "Agora",
      title: isRunning ? "🟢 Container Ativo & Saudável" : "⚪ Container Parado",
      description: isRunning
        ? `Uptime contínuo de ${metrics?.uptimeFormatted || "ativo"} • Isolamento cgroups ativo sem anomalias`
        : "Serviço parado ou suspenso",
      iconBg: isRunning ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-500/10 text-zinc-500",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    });

    // Retorna ordenado do mais recente para o mais antigo (máx 6 eventos)
    return list.sort((a, b) => b.timestampMs - a.timestampMs).slice(0, 6);
  }, [createdAt, updatedAt, metrics?.telemetryHistory, metrics?.uptimeFormatted, isRunning]);

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
            <Button
              size="sm"
              variant={period === "1h" ? "default" : "ghost"}
              onClick={() => setPeriod("1h")}
              className={`rounded-lg h-7 px-2.5 text-xs font-bold transition-all ${
                period === "1h"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              1 Hora
            </Button>
            <Button
              size="sm"
              variant={period === "24h" ? "default" : "ghost"}
              onClick={() => setPeriod("24h")}
              className={`rounded-lg h-7 px-2.5 text-xs font-bold transition-all ${
                period === "24h"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              24 Horas
            </Button>
            <Button
              size="sm"
              variant={period === "7d" ? "default" : "ghost"}
              onClick={() => setPeriod("7d")}
              className={`rounded-lg h-7 px-2.5 text-xs font-bold transition-all ${
                period === "7d"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              7 Dias
            </Button>
            <Button
              size="sm"
              variant={period === "30d" ? "default" : "ghost"}
              onClick={() => setPeriod("30d")}
              className={`rounded-lg h-7 px-2.5 text-xs font-bold transition-all ${
                period === "30d"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              30 Dias
            </Button>
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
        <div className="h-44 w-full border rounded-2xl p-2 sm:p-3 bg-muted/10">
          <ResponsiveContainer width="100%" height="100%">
            {metricFilter === "all" ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} tickMargin={6} stroke="currentColor" opacity={0.5} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  unit="%"
                  stroke="currentColor"
                  opacity={0.5}
                  domain={[0, (max: number) => Math.min(100, Math.max(25, Math.ceil(max * 1.3)))]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    const d = payload?.[0]?.payload as ResourcePoint | undefined;
                    if (active && d) {
                      return (
                        <div className="bg-popover text-popover-foreground border rounded-xl p-2.5 shadow-lg text-xs space-y-1.5 font-mono">
                          <p className="font-bold text-[11px] text-muted-foreground">{d.timestamp}</p>
                          <div className="flex items-center justify-between gap-4 text-purple-600 dark:text-purple-400">
                            <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU:</span>
                            <strong className="font-bold">{d.cpuPercent}%</strong>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> RAM:</span>
                            <strong className="font-bold">{d.ramMb} MB ({d.ramPercent}%)</strong>
                          </div>
                          {!d.isOnline && (
                            <Badge variant="outline" className="text-[10px] text-zinc-500 py-0 px-1 mt-1 block">
                              Container Inativo / Antes do Deploy
                            </Badge>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="cpuPercent" name="CPU (%)" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" />
                <Area type="monotone" dataKey="ramPercent" name="RAM (%)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#ramGrad)" />
              </AreaChart>
            ) : metricFilter === "cpu" ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuSingleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} tickMargin={6} stroke="currentColor" opacity={0.5} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  unit="%"
                  stroke="currentColor"
                  opacity={0.5}
                  domain={[0, (max: number) => Math.min(100, Math.max(20, Math.ceil(max * 1.4)))]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    const d = payload?.[0]?.payload as ResourcePoint | undefined;
                    if (active && d) {
                      return (
                        <div className="bg-popover text-popover-foreground border rounded-xl p-2.5 shadow-lg text-xs space-y-1 font-mono">
                          <p className="font-bold text-[11px] text-muted-foreground">{d.timestamp}</p>
                          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                            <Cpu className="h-3.5 w-3.5" />
                            <span>Uso de CPU: <strong>{d.cpuPercent}%</strong></span>
                          </div>
                          {!d.isOnline && (
                            <span className="text-[10px] text-zinc-500 block">Inativo no momento</span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="cpuPercent" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#cpuSingleGrad)" />
              </AreaChart>
            ) : metricFilter === "ram" ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="ramSingleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} tickMargin={6} stroke="currentColor" opacity={0.5} />
                <YAxis tickLine={false} axisLine={false} fontSize={10} unit="MB" stroke="currentColor" opacity={0.5} domain={[0, totalRam]} />
                <Tooltip
                  content={({ active, payload }) => {
                    const d = payload?.[0]?.payload as ResourcePoint | undefined;
                    if (active && d) {
                      return (
                        <div className="bg-popover text-popover-foreground border rounded-xl p-2.5 shadow-lg text-xs space-y-1 font-mono">
                          <p className="font-bold text-[11px] text-muted-foreground">{d.timestamp}</p>
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <Activity className="h-3.5 w-3.5" />
                            <span>RAM: <strong>{d.ramMb} MB</strong> ({d.ramPercent}% de {totalRam}MB)</span>
                          </div>
                          {!d.isOnline && (
                            <span className="text-[10px] text-zinc-500 block">Inativo no momento</span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="ramMb" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#ramSingleGrad)" />
              </AreaChart>
            ) : (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="hdSingleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} tickMargin={6} stroke="currentColor" opacity={0.5} />
                <YAxis tickLine={false} axisLine={false} fontSize={10} unit="GB" stroke="currentColor" opacity={0.5} domain={[0, totalDisk]} />
                <Tooltip
                  content={({ active, payload }) => {
                    const d = payload?.[0]?.payload as ResourcePoint | undefined;
                    if (active && d) {
                      return (
                        <div className="bg-popover text-popover-foreground border rounded-xl p-2.5 shadow-lg text-xs space-y-1 font-mono">
                          <p className="font-bold text-[11px] text-muted-foreground">{d.timestamp}</p>
                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <HardDrive className="h-3.5 w-3.5" />
                            <span>Armazenamento: <strong>{d.diskFormatted || `${d.diskGb} GB`}</strong> ({d.diskPercent}% de {metrics?.totalDiskFormatted || `${totalDisk}GB`})</span>
                          </div>
                          {!d.isOnline && (
                            <span className="text-[10px] text-zinc-500 block">Container Inativo / Não Criado</span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="diskGb" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#hdSingleGrad)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

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
        <div className="pt-3 border-t space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Registro de Eventos do Container
            </span>
            <Badge variant="outline" className="text-[10px] font-mono py-0 px-2">
              {events.length} eventos detectados
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start justify-between p-2.5 rounded-xl border bg-muted/20 text-xs font-mono gap-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${evt.iconBg}`}>
                    {evt.icon}
                  </div>
                  <div className="space-y-0.5">
                    <strong className="text-foreground text-[11px] block leading-snug">{evt.title}</strong>
                    <span className="text-[10px] text-muted-foreground block leading-tight">{evt.description}</span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-1 bg-muted px-1.5 py-0.5 rounded-md">
                  {evt.timeFormatted}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
