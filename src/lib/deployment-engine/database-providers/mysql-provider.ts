import { BaseDatabaseProvider } from "./base-provider";
import {
  DatabaseCredentials,
  DatabaseEngine,
  DatabaseProvisionPlan,
  DatabaseServiceRecord,
} from "./types";
import { HealthcheckConfig } from "../types";
import { CredentialGenerator } from "./credential-generator";

export class MySqlProvider extends BaseDatabaseProvider {
  public readonly engine: DatabaseEngine = "mysql";
  public readonly defaultPort = 3306;
  public readonly defaultImage = "mysql:8.4";
  public readonly supportedVersions = ["8.0", "8.4", "9.0"];
  public readonly mountPath = "/var/lib/mysql";

  public getProvisionPlan(service: DatabaseServiceRecord): DatabaseProvisionPlan {
    const port = service.connection.internalPort || this.defaultPort;
    const containerName = `eqsam_mysql_${service.id}`;
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
        MYSQL_DATABASE: service.credentials.database,
        MYSQL_USER: service.credentials.username,
        MYSQL_PASSWORD: service.credentials.password,
        MYSQL_ROOT_PASSWORD: service.credentials.rootPassword || service.credentials.password,
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
      command: `mysqladmin ping -h 127.0.0.1 -u ${creds.username} -p${creds.password}`,
      port,
      timeoutSeconds: 5,
      retries: 6,
      startPeriodSeconds: 15,
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
      MYSQL_URL: connString,
      DB_TYPE: "mysql",
      DB_HOST: host,
      DB_PORT: String(port),
      DB_USER: service.credentials.username,
      DB_PASSWORD: service.credentials.password,
      DB_NAME: service.credentials.database,
    };
  }
}
