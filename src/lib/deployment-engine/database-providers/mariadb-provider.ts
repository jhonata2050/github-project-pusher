import { BaseDatabaseProvider } from "./base-provider";
import {
  DatabaseCredentials,
  DatabaseEngine,
  DatabaseProvisionPlan,
  DatabaseServiceRecord,
} from "./types";
import { HealthcheckConfig } from "../types";
import { CredentialGenerator } from "./credential-generator";

export class MariaDbProvider extends BaseDatabaseProvider {
  public readonly engine: DatabaseEngine = "mariadb";
  public readonly defaultPort = 3306;
  public readonly defaultImage = "mariadb:11.4";
  public readonly supportedVersions = ["10.11", "11.2", "11.4"];
  public readonly mountPath = "/var/lib/mysql";

  public getProvisionPlan(service: DatabaseServiceRecord): DatabaseProvisionPlan {
    const port = service.connection.internalPort || this.defaultPort;
    const containerName = `eqsam_mariadb_${service.id}`;
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
        MARIADB_DATABASE: service.credentials.database,
        MARIADB_USER: service.credentials.username,
        MARIADB_PASSWORD: service.credentials.password,
        MARIADB_ROOT_PASSWORD: service.credentials.rootPassword || service.credentials.password,
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
      command: `mariadb-admin ping -h 127.0.0.1 -u ${creds.username} -p${creds.password}`,
      port,
      timeoutSeconds: 5,
      retries: 6,
      startPeriodSeconds: 12,
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
      MARIADB_URL: connString,
      DB_TYPE: "mariadb",
      DB_HOST: host,
      DB_PORT: String(port),
      DB_USER: service.credentials.username,
      DB_PASSWORD: service.credentials.password,
      DB_NAME: service.credentials.database,
    };
  }
}
