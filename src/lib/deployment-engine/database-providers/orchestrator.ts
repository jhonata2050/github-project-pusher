import { BaseDatabaseProvider } from "./base-provider";
import { PostgreSqlProvider } from "./postgres-provider";
import { MySqlProvider } from "./mysql-provider";
import { MariaDbProvider } from "./mariadb-provider";
import { RedisProvider } from "./redis-provider";
import { CredentialGenerator } from "./credential-generator";
import {
  DatabaseEngine,
  DatabaseProvisionPlan,
  DatabaseServiceRecord,
  RedisMode,
} from "./types";

export interface CreateDatabaseServiceParams {
  id: string;
  userId: string;
  projectId?: string;
  name: string;
  engine: DatabaseEngine;
  version?: string;
  customDbName?: string;
  redisMode?: RedisMode;
  nodeId?: string;
  nodeHost?: string;
  memoryLimitMb?: number;
  cpuLimit?: number;
  storageLimitGb?: number;
  enablePublicAccess?: boolean;
  publicPort?: number;
}

export class DatabaseOrchestrator {
  private static providers: Record<DatabaseEngine, BaseDatabaseProvider> = {
    postgresql: new PostgreSqlProvider(),
    mysql: new MySqlProvider(),
    mariadb: new MariaDbProvider(),
    redis: new RedisProvider(),
  };

  /**
   * Obtém o provider especializado para a engine solicitada
   */
  public static getProvider(engine: DatabaseEngine): BaseDatabaseProvider {
    const provider = this.providers[engine];
    if (!provider) {
      throw new Error(`Engine de banco de dados não suportada: '${engine}'. Engines válidas: postgresql, mysql, mariadb, redis.`);
    }
    return provider;
  }

  /**
   * Cria um registro estruturado de serviço de banco de dados
   */
  public static createDatabaseService(params: CreateDatabaseServiceParams): DatabaseServiceRecord {
    const provider = this.getProvider(params.engine);
    const credentials = CredentialGenerator.generate(params.engine, params.customDbName);

    const internalHost = `eqsam_${params.engine}_${params.id}`;
    const internalPort = provider.defaultPort;
    const nodeHost = params.nodeHost || "127.0.0.1";
    const nodeId = params.nodeId || "dk1-cluster";

    const isPublic = Boolean(params.enablePublicAccess);
    const publicPort = params.publicPort;

    const connectionString = CredentialGenerator.buildConnectionString(
      params.engine,
      credentials,
      internalHost,
      internalPort,
      false
    );

    const maskedConnectionString = CredentialGenerator.buildConnectionString(
      params.engine,
      credentials,
      internalHost,
      internalPort,
      true
    );

    const volumeName = `eqsam_data_${params.engine}_${params.id}`;
    const now = new Date().toISOString();

    const healthcheck = provider.getHealthcheckConfig(credentials, internalPort);

    return {
      id: params.id,
      userId: params.userId,
      projectId: params.projectId || "default",
      name: params.name,
      engine: params.engine,
      version: params.version || provider.defaultImage.split(":")[1],
      image: provider.resolveImage(params.version),
      redisMode: params.redisMode || "persistent",
      status: "creating",
      credentials,
      connection: {
        internalHost,
        internalPort,
        publicHost: nodeHost,
        publicPort,
        isPubliclyExposed: isPublic,
        connectionString,
        maskedConnectionString,
      },
      volume: {
        volumeId: `vol_${params.id}`,
        volumeName,
        mountPath: provider.mountPath,
        storageLimitMb: (params.storageLimitGb || 10) * 1024,
        protected: true, // Imutável em restarts/rebuilds
      },
      nodeId,
      nodeHost,
      resources: {
        memoryLimitMb: params.memoryLimitMb || 512,
        cpuLimit: params.cpuLimit || 0.5,
        storageLimitGb: params.storageLimitGb || 10,
      },
      healthcheck,
      validationPolicy: {
        requireHealthcheck: true,
        requireDomainVerification: false, // Bancos operam via TCP, sem proxy web
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Gera o plano de provisionamento para o Docker / Coolify
   */
  public static getProvisionPlan(service: DatabaseServiceRecord): DatabaseProvisionPlan {
    const provider = this.getProvider(service.engine);
    return provider.getProvisionPlan(service);
  }

  /**
   * Vincula e injeta credenciais do banco nas variáveis de ambiente de uma aplicação consumidora
   */
  public static injectConnectionIntoApp(
    existingEnvs: Array<{ key: string; value: string }>,
    databaseService: DatabaseServiceRecord,
    isSameNode = true
  ): Array<{ key: string; value: string }> {
    const provider = this.getProvider(databaseService.engine);
    const connVars = provider.getConnectionVariables(databaseService, isSameNode);

    const updated = [...existingEnvs];

    for (const [key, value] of Object.entries(connVars)) {
      const idx = updated.findIndex((e) => e.key === key);
      if (idx >= 0) {
        updated[idx] = { key, value };
      } else {
        updated.push({ key, value });
      }
    }

    return updated;
  }

  /**
   * Executa a deleção segura do serviço de banco de dados
   */
  public static deleteDatabaseService(
    service: DatabaseServiceRecord,
    confirmationName?: string,
    purgeData = false
  ): {
    success: boolean;
    message: string;
    volumePreserved: boolean;
  } {
    if (purgeData) {
      if (confirmationName !== service.name) {
        throw new Error(
          `Para expurgar permanentemente os dados do banco '${service.name}', é obrigatório confirmar digitando o nome exato do banco de dados.`
        );
      }
      return {
        success: true,
        message: `Banco de dados '${service.name}' e volume de dados '${service.volume.volumeName}' expurgados com sucesso.`,
        volumePreserved: false,
      };
    }

    // Deleção normal (preserva dados no volume)
    return {
      success: true,
      message: `Container do banco '${service.name}' removido. Volume persistente '${service.volume.volumeName}' mantido em segurança no disco.`,
      volumePreserved: true,
    };
  }
}
