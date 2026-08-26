import { BaseDatabaseProvider } from "./base-provider";
import {
  DatabaseCredentials,
  DatabaseEngine,
  DatabaseProvisionPlan,
  DatabaseServiceRecord,
} from "./types";
import { HealthcheckConfig } from "../types";
import { CredentialGenerator } from "./credential-generator";

export class PostgreSqlProvider extends BaseDatabaseProvider {
  public readonly engine: DatabaseEngine = "postgresql";
  public readonly defaultPort = 5432;
  public readonly defaultImage = "postgres:16-alpine";
  public readonly supportedVersions = ["15-alpine", "16-alpine", "17-alpine", "15", "16", "17"];
  public readonly mountPath = "/var/lib/postgresql/data";

  public getProvisionPlan(service: DatabaseServiceRecord): DatabaseProvisionPlan {
    const port = service.connection.internalPort || this.defaultPort;
    const containerName = `eqsam_pg_${service.id}`;
    const networkName = `eqsam_net_${service.projectId || "default"}`;
    const volumeName = service.volume.volumeName;

    return {
      engine: this.engine,
      image: this.resolveImage(service.version),
      containerName,
      networkName,
      volumeName,
      mountPath: this.mountPath,
      environment: {
        POSTGRES_DB: service.credentials.database,
        POSTGRES_USER: service.credentials.username,
        POSTGRES_PASSWORD: service.credentials.password,
        PGDATA: "/var/lib/postgresql/data/pgdata",
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
      command: `pg_isready -U ${creds.username} -d ${creds.database}`,
      port,
      timeoutSeconds: 5,
      retries: 6,
      startPeriodSeconds: 10,
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
      DATABASE_URL: connString,
      POSTGRES_URL: connString,
      DB_TYPE: "postgresql",
      DB_HOST: host,
      DB_PORT: String(port),
      DB_USER: service.credentials.username,
      DB_PASSWORD: service.credentials.password,
      DB_NAME: service.credentials.database,
    };
  }
}
