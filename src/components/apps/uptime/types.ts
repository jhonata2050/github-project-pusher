import React from "react";

export type UptimePeriod = "1h" | "24h" | "7d" | "30d";
export type MetricFilter = "all" | "cpu" | "ram" | "hd";

export interface TelemetryPoint {
  label?: string | undefined;
  timestamp: string;
  cpuPercent: number;
  ramMb: number;
  ramPercent: number;
  diskGb: number;
  diskBytes?: number | undefined;
  diskFormatted?: string | undefined;
  diskPercent: number;
  isOnline?: boolean | undefined;
}

export interface UptimeMetrics {
  usedRamMb?: number | undefined;
  totalRamMb?: number | undefined;
  ramUsagePercent?: number | undefined;
  cpuUsagePercent?: number | undefined;
  cpuCores?: number | undefined;
  usedDiskGb?: number | undefined;
  usedDiskMb?: number | undefined;
  usedDiskBytes?: number | undefined;
  usedDiskFormatted?: string | undefined;
  totalDiskGb?: number | undefined;
  totalDiskMb?: number | undefined;
  totalDiskFormatted?: string | undefined;
  diskUsagePercent?: number | undefined;
  uptimeSeconds?: number | undefined;
  uptimeFormatted?: string | undefined;
  telemetryHistory?: Array<TelemetryPoint> | undefined;
}

export interface UptimeMonitoringSectionProps {
  appId: string;
  appName?: string | undefined;
  fqdn?: string | undefined;
  status?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  metrics?: UptimeMetrics | undefined;
}

export interface ResourcePoint {
  label: string;
  timestamp: string;
  cpuPercent: number;
  ramMb: number;
  ramPercent: number;
  diskGb: number;
  diskFormatted?: string | undefined;
  diskPercent: number;
  isOnline: boolean;
}

export interface ContainerEventItem {
  id: string;
  timestampMs: number;
  timeFormatted: string;
  title: string;
  description: string;
  iconBg: string;
  icon: React.ReactNode;
}

export interface ResourceSummary {
  avgCpu: number;
  maxCpu: number;
  avgRamMb: number;
  avgRamPercent: number;
  diskGb: number;
  diskPercent: number;
}
