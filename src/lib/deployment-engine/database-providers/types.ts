import { HealthcheckConfig, DeploymentValidationPolicy } from "../types";

export type DatabaseEngine = "postgresql" | "mysql" | "mariadb" | "redis";

export type RedisMode = "persistent" | "cache";

export type DatabaseStatus =
  | "creating"
  | "starting"
  | "ready"
  | "unhealthy"
  | "stopped"
  | "failed"
  | "deleting";

export interface DatabaseCredentials {
  database: string;
  username: string;
  password: string;         // Secret criptograficamente gerado
  rootPassword?: string;     // Para MySQL / MariaDB
}

export interface DatabaseConnectionInfo {
  internalHost: string;      // Hostname dentro da Docker network (ex: db-pg-123)
  internalPort: number;      // Porta interna padrão (ex: 5432)
  publicHost?: string;       // IP/Host do nó quando acesso externo for habilitado
  publicPort?: number;       // Porta pública mapeada no nó (ex: 15432)
  isPubliclyExposed: boolean;// Padrão: false (fechado para internet)
  connectionString: string;  // postgresql://user:pass@host:port/db
  maskedConnectionString: string; // postgresql://user:••••••••@host:port/db
}

export interface DatabaseVolumeConfig {
  volumeId: string;
  volumeName: string;        // Ex: eqsam_data_pg_123
  mountPath: string;         // Ex: /var/lib/postgresql/data
  storageLimitMb?: number;
  protected: boolean;        // Impede deleção em restarts/rebuilds
}

export interface DatabaseResourceLimits {
  memoryLimitMb: number;
  cpuLimit: number;
  storageLimitGb: number;
}

export interface DatabaseServiceRecord {
  id: string;
  userId: string;
  projectId?: string;
  name: string;
  engine: DatabaseEngine;
  version: string;
  image: string;
  redisMode?: RedisMode;
  status: DatabaseStatus;
  credentials: DatabaseCredentials;
  connection: DatabaseConnectionInfo;
  volume: DatabaseVolumeConfig;
  nodeId: string;            // ID do servidor/VPS onde o banco está alocado
  nodeHost: string;          // IP/FQDN do servidor/VPS
  isCrossNode?: boolean;     // Se a aplicação consumidora está em outro node
  resources: DatabaseResourceLimits;
  healthcheck: HealthcheckConfig;
  validationPolicy: DeploymentValidationPolicy;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseProvisionPlan {
  engine: DatabaseEngine;
  image: string;
  containerName: string;
  networkName: string;
  volumeName: string;
  mountPath: string;
  environment: Record<string, string>;
  command?: string;
  internalPort: number;
  publicPort?: number;
  isPubliclyExposed: boolean;
  healthcheck: HealthcheckConfig;
  resources: DatabaseResourceLimits;
  connection: DatabaseConnectionInfo;
}
