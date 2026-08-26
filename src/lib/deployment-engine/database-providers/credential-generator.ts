import crypto from "crypto";
import { DatabaseCredentials, DatabaseEngine } from "./types";

export class CredentialGenerator {
  // Alfabeto seguro alfanumérico que não quebra comandos shell, URLs ou JSON
  private static readonly SAFE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  /**
   * Gera uma string criptograficamente aleatória e segura
   */
  public static generateSecureString(length = 24): string {
    const bytes = crypto.randomBytes(length);
    let result = "";
    const alphabetLength = this.SAFE_ALPHABET.length;
    for (let i = 0; i < length; i++) {
      result += this.SAFE_ALPHABET[bytes[i] % alphabetLength];
    }
    return result;
  }

  /**
   * Gera credenciais padrão seguras para uma engine de banco de dados
   */
  public static generate(engine: DatabaseEngine, customDbName?: string): DatabaseCredentials {
    const randomSuffix = this.generateSecureString(6).toLowerCase();
    const password = this.generateSecureString(28);

    if (engine === "postgresql") {
      const database = customDbName ? this.sanitizeIdentifier(customDbName) : `pg_${randomSuffix}`;
      const username = `pguser_${randomSuffix}`;
      return {
        database,
        username,
        password,
      };
    }

    if (engine === "mysql" || engine === "mariadb") {
      const database = customDbName ? this.sanitizeIdentifier(customDbName) : `db_${randomSuffix}`;
      const username = `user_${randomSuffix}`;
      const rootPassword = this.generateSecureString(28);
      return {
        database,
        username,
        password,
        rootPassword,
      };
    }

    if (engine === "redis") {
      return {
        database: "0",
        username: "default",
        password,
      };
    }

    return {
      database: "main",
      username: "dbuser",
      password,
    };
  }

  /**
   * Sanitiza nomes de databases e identificadores
   */
  public static sanitizeIdentifier(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 32) || "main_db";
  }

  /**
   * Constrói Connection String no formato padrão URI
   */
  public static buildConnectionString(
    engine: DatabaseEngine,
    creds: DatabaseCredentials,
    host: string,
    port: number,
    masked = false
  ): string {
    const pass = masked ? "••••••••" : creds.password;

    switch (engine) {
      case "postgresql":
        return `postgresql://${creds.username}:${pass}@${host}:${port}/${creds.database}?sslmode=prefer`;
      case "mysql":
      case "mariadb":
        return `mysql://${creds.username}:${pass}@${host}:${port}/${creds.database}`;
      case "redis":
        return `redis://${creds.username || "default"}:${pass}@${host}:${port}/${creds.database || "0"}`;
      default:
        return `${engine}://${creds.username}:${pass}@${host}:${port}/${creds.database}`;
    }
  }
}
