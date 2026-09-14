export interface TelemetryPoint {
  label: string;
  timestamp: string;
  cpuPercent: number;
  ramMb: number;
  ramPercent: number;
  diskGb: number;
  diskBytes: number;
  diskFormatted: string;
  diskPercent: number;
  isOnline: boolean;
}

export interface ContainerBreakdownItem {
  name: string;
  role: string;
  usedRamMb: number;
  cpuPercent: number;
}

export interface LiveContainerMetrics {
  usedRamMb: number;
  totalRamMb: number;
  ramUsagePercent: number;
  cpuUsagePercent: number;
  cpuCores: number;
  usedDiskBytes: number;
  usedDiskFormatted: string;
  usedDiskMb: number;
  usedDiskGb: number;
  totalDiskMb: number;
  totalDiskGb: number;
  totalDiskFormatted: string;
  diskUsagePercent: number;
  uptimeSeconds: number;
  uptimeFormatted: string;
  networkInKb: number;
  networkOutKb: number;
  pids?: number | undefined;
  cpuStatus?: "idle" | "stable" | "high" | "critical" | undefined;
  ramStatus?: "normal" | "high" | "critical" | undefined;
  shouldUpgrade?: boolean | undefined;
  upgradeReason?: string | undefined;
  isOnline: boolean;
  telemetryHistory: TelemetryPoint[];
  containerBreakdown?: ContainerBreakdownItem[] | undefined;
}
