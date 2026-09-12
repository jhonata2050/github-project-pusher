import type { ApplicationRecord, ClusterServerConfig } from "../../cloud-apps.server";
import type { DeploymentRuntime } from "../../templates.data";

export interface TemplateLimits {
  memLimit: string;
  cpuLimit: string;
  // Multi-container budgeting: WordPress, N8N
  appWpMem: string;
  appWpCpu: string;
  dbWpMem: string;
  dbWpCpu: string;
  // Typebot
  tbBuilderMem: string;
  tbBuilderCpu: string;
  tbViewerMem: string;
  tbViewerCpu: string;
  tbDbMem: string;
  tbDbCpu: string;
  // Standalone DBs + Web UI
  dbMem: string;
  dbCpu: string;
  adminerMem: string;
  adminerCpu: string;
  // OpenStatus
  osAppMem: string;
  osAppCpu: string;
  osDashMem: string;
  osDashCpu: string;
  osDbMem: string;
  osDbCpu: string;
}

export interface TemplateContext {
  cleanId: string;
  stackName: string;
  cleanHost: string;
  templateId: string;
  app: ApplicationRecord;
  server: ClusterServerConfig;
  wildcard: string;
  stackDir: string;
  template: {
    id?: string | undefined;
    git_repository?: string | undefined;
    git_branch?: string | undefined;
    build_pack?: "nixpacks" | "dockerfile" | "dockercompose" | "static" | undefined;
    runtime?: DeploymentRuntime | undefined;
    default_envs?: Array<{ key: string; value: string }> | undefined;
    default_port?: number | undefined;
    name?: string | undefined;
  };
  getEnv: (key: string, fallback?: string) => string;
  limits: TemplateLimits;
}
