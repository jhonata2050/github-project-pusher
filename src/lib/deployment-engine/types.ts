/**
 * Core Types for the Deployment Engine (PaaS Layer)
 */

export type DeployState =
  | "QUEUED"
  | "VALIDATING"
  | "BUILDING"
  | "STARTING"
  | "HEALTH_CHECKING"
  | "VERIFYING_DOMAIN"
  | "READY"
  | "FAILED"
  | "RESTARTING"
  | "STOPPED"
  | "ROLLING_BACK";

export type EnvVarScope = "build" | "runtime" | "both";
export type EnvVarType = "build_time" | "runtime" | "public" | "secret";

export interface EnvVarMetadata {
  key: string;
  value: string;
  type: EnvVarType;
  scope: EnvVarScope;
  required?: boolean;
  isSecret?: boolean;
  description?: string;
  requiresRebuild?: boolean;
}

export type HealthcheckType = "http" | "tcp" | "command" | "process";

export interface HealthcheckConfig {
  type: HealthcheckType;
  path?: string;
  port?: number;
  expectedStatus?: number[]; // Padrão: [200, 201, 202, 204, 301, 302, 307, 308]
  timeoutSeconds?: number;
  retries?: number;
  intervalSeconds?: number;
  startPeriodSeconds?: number;
  command?: string;
}

export interface DeploymentValidationPolicy {
  requireHealthcheck: boolean;
  requireDomainVerification: boolean; // false para bancos e workers sem web proxy
  expectedDomainStatuses?: number[];
  dependencies?: string[]; // IDs de serviços que devem estar saudáveis antes (ex: ["mysql"])
}

export interface DiagnosticAction {
  label: string;
  type: "configure_env" | "fix_port" | "view_database" | "view_logs" | "rebuild" | "custom";
  payload?: any;
}

export interface DeploymentDiagnostic {
  code: string;
  title: string;
  description: string;
  possibleCause: string;
  action?: DiagnosticAction;
  technicalError?: string;
  timestamp: string;
}

export interface DeploymentStepLog {
  state: DeployState;
  timestamp: string;
  message: string;
  isSuccess?: boolean;
  durationMs?: number;
}

export interface DeploymentSession {
  deploymentUuid: string;
  appId: string;
  appName: string;
  userId: string;
  currentState: DeployState;
  previousState?: DeployState;
  templateId?: string;
  steps: DeploymentStepLog[];
  diagnostic?: DeploymentDiagnostic;
  healthcheck?: HealthcheckConfig;
  validationPolicy: DeploymentValidationPolicy;
  isIdempotentReconciliation?: boolean;
  startedAt: string;
  completedAt?: string;
}

// ==========================================
// ETAPA 3: STACKS WEB & DETECÇÃO DE PROJETOS
// ==========================================

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export type FrameworkType =
  | "nextjs"
  | "react_vite"
  | "node_api"
  | "static_html"
  | "dockerfile"
  | "docker_compose"
  | "unknown";

export type NextJsVariant = "ssr" | "standalone" | "static_export";
export type NextJsRouter = "app_router" | "pages_router" | "both" | "unknown";
export type ViteVariant = "spa" | "ssr";
export type NodeFramework = "express" | "fastify" | "nestjs" | "koa" | "hono" | "vanilla" | "typescript";

export interface DetectedProject {
  packageManager: PackageManager;
  lockfilesFound: string[];
  hasMultipleLockfiles: boolean;
  lockfileWarning?: string;
  framework: FrameworkType;
  version?: string;
  nextVariant?: NextJsVariant;
  nextRouter?: NextJsRouter;
  viteVariant?: ViteVariant;
  nodeFramework?: NodeFramework;
  entrypoint?: string;
  hasBuildScript: boolean;
  hasStartScript: boolean;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  defaultPort: number;
}

export interface ResolvedBuildStrategy {
  framework: FrameworkType;
  runtime: "nixpacks" | "dockerfile" | "static";
  packageManager: PackageManager;
  installCommand: string;
  buildCommand: string | null;
  startCommand: string;
  outputDirectory?: string;
  entrypoint?: string;
  port: number;
  environment: Record<string, string>;
  healthcheck: HealthcheckConfig;
  validationPolicy: DeploymentValidationPolicy;
}
