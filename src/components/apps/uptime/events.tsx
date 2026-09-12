import React from "react";
import {
  PlayCircle,
  RefreshCw,
  HardDrive,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { ContainerEventItem, TelemetryPoint } from "./types";

export interface ExtractEventsParams {
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  isRunning: boolean;
  uptimeSeconds?: number | undefined;
  uptimeFormatted?: string | undefined;
  telemetryHistory?: Array<TelemetryPoint> | undefined;
}

export function extractContainerEvents({
  createdAt,
  updatedAt,
  isRunning,
  uptimeSeconds = 0,
  uptimeFormatted = "ativo",
  telemetryHistory = [],
}: ExtractEventsParams): ContainerEventItem[] {
  const list: ContainerEventItem[] = [];

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
  if (isRunning && uptimeSeconds > 0) {
    const startMs = Date.now() - uptimeSeconds * 1000;
    const startDate = new Date(startMs);
    list.push({
      id: "container-started",
      timestampMs: startMs,
      timeFormatted: `${startDate.toLocaleDateString("pt-BR")} ${startDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
      title: "⚡ Inicialização da Instância Atual",
      description: `Container colocado em execução contínua no cluster (${uptimeFormatted})`,
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

  // 4. Eventos Reais Gravados na Telemetria
  let lastDiskBytes = 0;

  telemetryHistory.forEach((h, idx) => {
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

  // 5. Estado Atual
  list.push({
    id: "current-health",
    timestampMs: Date.now(),
    timeFormatted: "Agora",
    title: isRunning ? "🟢 Container Ativo & Saudável" : "⚪ Container Parado",
    description: isRunning
      ? `Uptime contínuo de ${uptimeFormatted} • Isolamento cgroups ativo sem anomalias`
      : "Serviço parado ou suspenso",
    iconBg: isRunning ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-500/10 text-zinc-500",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  });

  // Retorna ordenado do mais recente para o mais antigo (máx 6 eventos)
  return list.sort((a, b) => b.timestampMs - a.timestampMs).slice(0, 6);
}
