import { UptimePeriod, ResourcePoint, ResourceSummary, TelemetryPoint } from "./types";

export function buildRealResourceTimeline(
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
  history: Array<TelemetryPoint> = []
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
  const firstPoint = sortedHistory[0];
  const earliestHistoryMs = firstPoint ? new Date(firstPoint.timestamp).getTime() : currentRunStartMs;
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

    const initialMatch = matchingPoints[0];
    if (matchingPoints.length > 0 && initialMatch) {
      // Priorizar o maior pico de CPU para registrar stress tests
      const peakPoint = matchingPoints.reduce(
        (max, cur) => (cur.cpuPercent > max.cpuPercent ? cur : max),
        initialMatch
      );
      points.push({
        label,
        timestamp: fullTimestamp,
        cpuPercent: peakPoint.cpuPercent,
        ramMb: peakPoint.ramMb,
        ramPercent: peakPoint.ramPercent,
        diskGb: typeof peakPoint.diskGb === "number" ? peakPoint.diskGb : (peakPoint.diskBytes ? Number((peakPoint.diskBytes / (1024 * 1024 * 1024)).toFixed(3)) : 0),
        diskFormatted: peakPoint.diskFormatted ?? (peakPoint.diskGb ? `${peakPoint.diskGb} GB` : "0 B"),
        diskPercent: peakPoint.diskPercent,
        isOnline: peakPoint.isOnline ?? true,
      });
      continue;
    }

    // 4. Forward-fill: usar o último ponto conhecido no passado
    const pastPoints = sortedHistory.filter(
      (h) => new Date(h.timestamp).getTime() <= pointTimeMs
    );
    const lastKnown = pastPoints[pastPoints.length - 1];
    if (lastKnown) {
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
    const firstRecorded = sortedHistory[0];
    if (firstRecorded) {
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

export function computeResourceSummary(
  data: ResourcePoint[],
  currentDiskGb: number,
  totalRam: number,
  totalDisk: number,
  isRunning: boolean,
  diskUsagePercent?: number,
  history: Array<TelemetryPoint> = []
): ResourceSummary {
  if (!data.length) {
    return { avgCpu: 0, maxCpu: 0, avgRamMb: 0, avgRamPercent: 0, diskGb: currentDiskGb, diskPercent: 0 };
  }
  const activeData = isRunning ? data.filter((d) => d.isOnline) : [];
  const sourceData = activeData.length > 0 ? activeData : data;

  const avgCpu = Number((sourceData.reduce((acc, p) => acc + p.cpuPercent, 0) / sourceData.length).toFixed(1));
  const historyMaxCpu = Math.max(0, ...history.map((h) => h.cpuPercent));
  const maxCpu = Math.max(historyMaxCpu, ...sourceData.map((p) => p.cpuPercent));
  const avgRamMb = Math.round(sourceData.reduce((acc, p) => acc + p.ramMb, 0) / sourceData.length);
  const avgRamPercent = totalRam > 0 ? Math.round((avgRamMb / totalRam) * 100) : 0;
  const lastDataPoint = data[data.length - 1];
  const diskGb = lastDataPoint ? lastDataPoint.diskGb : currentDiskGb;
  const diskPercent = diskUsagePercent ?? Math.round((diskGb / totalDisk) * 100);

  return { avgCpu, maxCpu, avgRamMb, avgRamPercent, diskGb, diskPercent };
}
