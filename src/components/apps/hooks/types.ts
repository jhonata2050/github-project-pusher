export interface UseAppManagementOptions {
  appId: string;
}

export interface DnsCheckResult {
  success: boolean;
  isConfigured: boolean;
  cleanDomain?: string;
  targetClusterIp?: string;
  aRecords?: string[];
  cnameRecords?: string[];
  status?: string;
  message: string;
}

export interface DeploymentLog {
  output: string;
  type: string;
}

export type DeploymentStatus = "queued" | "in_progress" | "finished" | "failed" | null;

export interface AppEnvItem {
  key: string;
  value: string;
  is_build_time?: boolean | undefined;
}

export interface AppMetricsSummary {
  usedRamMb: number;
  totalRamMb: number;
  ramUsagePercent: number;
  cpuUsagePercent: number;
  cpuCores: number;
  usedDiskBytes: number;
  usedDiskFormatted: string;
  usedDiskGb: number;
  usedDiskMb: number;
  totalDiskMb: number;
  totalDiskGb: number;
  totalDiskFormatted: string;
  diskUsagePercent: number;
  uptimeSeconds: number;
  uptimeFormatted: string;
  networkInKb: number;
  networkOutKb: number;
  pids: number;
  cpuStatus: string;
  ramStatus: string;
  shouldUpgrade: boolean;
  upgradeReason: string;
  telemetryHistory: any[];
}
