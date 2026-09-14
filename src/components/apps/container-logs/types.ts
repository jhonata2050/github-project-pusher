export interface ContainerLogsViewerProps {
  logs: string;
  appName?: string | undefined;
  buildPack?: string | undefined;
  isLoading?: boolean | undefined;
  onRefresh?: (() => void) | undefined;
}

export type LogLevel = "all" | "info" | "warn" | "error" | "debug";
export type LogDisplayMode = "formatted" | "raw";

export interface ParsedLogLine {
  id: string;
  index: number;
  raw: string;
  timestamp: string;
  source: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  meta: Record<string, any>;
  isJson: boolean;
}

export function getEngineBadge(buildPack?: string): string {
  if (buildPack === "static") return "Caddy Server 2 (HTTP/3)";
  if (buildPack === "dockerfile") return "Dockerfile Container";
  if (buildPack === "dockercompose") return "Docker Compose Stack";
  if (buildPack === "nixpacks") return "Nixpacks Auto-Engine";
  return buildPack || "Cluster Service";
}
