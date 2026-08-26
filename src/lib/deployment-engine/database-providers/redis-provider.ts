import { BaseDatabaseProvider } from "./base-provider";
import {
  DatabaseCredentials,
  DatabaseEngine,
  DatabaseProvisionPlan,
  DatabaseServiceRecord,
} from "./types";
import { HealthcheckConfig } from "../types";
import { CredentialGenerator } from "./credential-generator";

export class RedisProvider extends BaseDatabaseProvider {
  public readonly engine: DatabaseEngine = "redis";
  public readonly defaultPort = 6379;
  public readonly defaultImage = "redis:7.2-alpine";
  public readonly supportedVersions = ["7.0-alpine", "7.2-alpine", "7.4-alpine", "7.0", "7.2", "7.4"];
  public readonly mountPath = "/data";

  public getProvisionPlan(service: DatabaseServiceRecord): DatabaseProvisionPlan {
    const port = service.connection.internalPort || this.defaultPort;
    const containerName = `eqsam_redis_${service.id}`;
    const networkName = `eqsam_net_${service.projectId || "default"}`;
    const volumeName = service.volume.volumeName;
    const isPersistent = service.redisMode !== "cache";

    const command = isPersistent
      ? `redis-server --requirepass ${service.credentials.password} --appendonly yes`
      : `redis-server --requirepass ${service.credentials.password} --maxmemory ${service.resources.memoryLimitMb}mb --maxmemory-policy allkeys-lru`;

    return {
      engine: this.engine,
      image: this.resolveImage(service.version),
      containerName,
      networkName,
      volumeName,
      mountPath: this.mountPath,
      command,
      environment: {
        REDIS_PASSWORD: service.credentials.password,
      },
      internalPort: port,
      publicPort: service.connection.isPubliclyExposed ? service.connection.publicPort : undefined,
      isPubliclyExposed: service.connection.isPubliclyExposed,
      healthcheck: this.getHealthcheckConfig(service.credentials, port),
      resources: service.resources,
      connection: service.connection,
    };
  }

  public getHealthcheckConfig(creds: DatabaseCredentials, port: number): HealthcheckConfig {
    return {
      type: "command",
      command: `redis-cli -a ${creds.password} ping`,
      port,
      timeoutSeconds: 4,
      retries: 5,
      startPeriodSeconds: 4,
    };
  }

  public getConnectionVariables(
    service: DatabaseServiceRecord,
    useInternalNetwork = true
  ): Record<string, string> {
    const host = useInternalNetwork
      ? service.connection.internalHost
      : service.connection.publicHost || service.nodeHost;

    const port = useInternalNetwork
      ? service.connection.internalPort
      : service.connection.publicPort || service.connection.internalPort;

    const connString = CredentialGenerator.buildConnectionString(
      this.engine,
      service.credentials,
      host,
      port
    );

    return {
      REDIS_URL: connString,
      DB_TYPE: "redis",
      REDIS_HOST: host,
      REDIS_PORT: String(port),
      REDIS_PASSWORD: service.credentials.password,
    };
  }
}
