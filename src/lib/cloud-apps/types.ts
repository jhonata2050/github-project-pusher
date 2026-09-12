export interface ClusterServerConfig {
  id: string;
  name: string;
  apiUrl?: string | undefined;
  apiToken?: string | undefined;
  wildcardDomain: string;
  isActive: boolean;
  maxApplications: number;
  serverIp?: string | undefined;
  host?: string | undefined;
  sshPort?: number | undefined;
  sshUser?: string | undefined;
  sshPassword?: string | undefined;
  sshKey?: string | undefined;
  hasSwarm?: boolean | undefined;
  hasDocker?: boolean | undefined;
  isHardened?: boolean | undefined;
  created_at: string;
  updated_at?: string | undefined;
}

export interface ApplicationRecord {
  id: string;
  service_id: string;
  user_id: string;
  server_id: string;
  project_uuid?: string | undefined;
  environment_name?: string | undefined;
  app_uuid: string;
  stack_name?: string | undefined;
  name: string;
  build_pack: "nixpacks" | "dockerfile" | "dockercompose" | "static";
  git_repository?: string | undefined;
  git_branch?: string | undefined;
  fqdn: string;
  default_subdomain?: string | undefined;
  custom_domain?: string | undefined;
  cpu_limit: number;
  memory_limit: number;
  disk_limit_mb?: number | undefined;
  status: "running" | "stopped" | "exited" | "building" | "error" | "provisioning";
  template_id?: string | undefined;
  container_root?: string | undefined;
  direct_port?: number | undefined;
  created_at: string;
  updated_at?: string | undefined;
  service?: any;
  user?: any;
  env_vars?: AppEnvVar[] | undefined;
}

export interface AppEnvVar {
  id?: string | undefined;
  key: string;
  value: string;
  is_build_time?: boolean | undefined;
  is_literal?: boolean | undefined;
}

export interface ActiveDeploymentRecord {
  uuid: string;
  appId: string;
  status: "queued" | "in_progress" | "finished" | "failed";
  step: number;
  logs: Array<{ output: string; type: "stdout" | "stderr" }>;
  serverName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppFileItem {
  path: string;
  name: string;
  type: "file" | "dir";
  size?: string;
  content?: string;
  updated_at?: string;
}

export interface GitDeploymentOptions {
  appId: string;
  gitRepository: string;
  gitBranch?: string | undefined;
  resetContainer?: boolean | undefined;
}

export const activeDeployments: Map<string, ActiveDeploymentRecord> =
  (globalThis as any).__eqsam_active_deployments ||
  ((globalThis as any).__eqsam_active_deployments = new Map<string, ActiveDeploymentRecord>());
