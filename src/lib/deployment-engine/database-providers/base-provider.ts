import {
  DatabaseCredentials,
  DatabaseEngine,
  DatabaseProvisionPlan,
  DatabaseServiceRecord,
} from "./types";
import { HealthcheckConfig } from "../types";

export abstract class BaseDatabaseProvider {
  public abstract readonly engine: DatabaseEngine;
  public abstract readonly defaultPort: number;
  public abstract readonly defaultImage: string;
  public abstract readonly supportedVersions: string[];
  public abstract readonly mountPath: string;

  /**
   * Valida se a versão solicitada é suportada
   */
  public isVersionSupported(version: string): boolean {
    return this.supportedVersions.includes(version) || version === this.defaultImage.split(":")[1];
  }

  /**
   * Resolve a tag/imagem Docker final
   */
  public resolveImage(version?: string): string {
    if (!version) return this.defaultImage;
    const baseName = this.defaultImage.split(":")[0];
    return `${baseName}:${version}`;
  }

  /**
   * Gera o plano de provisionamento do container
   */
  public abstract getProvisionPlan(service: DatabaseServiceRecord): DatabaseProvisionPlan;

  /**
   * Retorna a configuração de healthcheck especializada
   */
  public abstract getHealthcheckConfig(creds: DatabaseCredentials, port: number): HealthcheckConfig;

  /**
   * Retorna o dicionário de variáveis de ambiente para injeção em aplicações consumidoras
   */
  public abstract getConnectionVariables(
    service: DatabaseServiceRecord,
    useInternalNetwork: boolean
  ): Record<string, string>;
}
