import { EnvVarMetadata, EnvVarType, EnvVarScope } from "./types";

export class EnvironmentManager {
  /**
   * Classifica uma variável de ambiente com base em padrões de nomenclatura e overrides de template
   */
  public static classifyVariable(
    key: string,
    value: string = "",
    templateOverride?: Partial<EnvVarMetadata>
  ): EnvVarMetadata {
    const cleanKey = key.trim().toUpperCase();

    // 1. Detecção automática de variáveis públicas / build-time (Next.js, Vite, Nuxt)
    const isPublicBuildTime =
      cleanKey.startsWith("NEXT_PUBLIC_") ||
      cleanKey.startsWith("VITE_") ||
      cleanKey.startsWith("PUBLIC_") ||
      cleanKey.startsWith("NUXT_PUBLIC_") ||
      cleanKey.startsWith("REACT_APP_");

    // 2. Detecção automática de segredos / credenciais
    const isSecretPattern =
      cleanKey.includes("PASSWORD") ||
      cleanKey.includes("SECRET") ||
      cleanKey.includes("PRIVATE_KEY") ||
      cleanKey.includes("TOKEN") ||
      cleanKey.includes("AUTH_KEY") ||
      cleanKey.includes("API_KEY") ||
      cleanKey.includes("DATABASE_URL") ||
      cleanKey.endsWith("_PASS") ||
      cleanKey.endsWith("_KEY");

    let type: EnvVarType = "runtime";
    let scope: EnvVarScope = "runtime";
    let requiresRebuild = false;
    let isSecret = false;

    if (isPublicBuildTime) {
      type = "public";
      scope = "both";
      requiresRebuild = true;
    } else if (isSecretPattern) {
      type = "secret";
      scope = "runtime";
      isSecret = true;
    } else if (templateOverride?.type === "build_time") {
      type = "build_time";
      scope = "build";
      requiresRebuild = true;
    }

    // 3. Aplica overrides do template se fornecidos
    return {
      key: key.trim(),
      value: value,
      type: templateOverride?.type || type,
      scope: templateOverride?.scope || scope,
      required: templateOverride?.required || false,
      isSecret: templateOverride?.isSecret !== undefined ? templateOverride.isSecret : isSecret,
      description: templateOverride?.description || "",
      requiresRebuild: templateOverride?.requiresRebuild !== undefined ? templateOverride.requiresRebuild : requiresRebuild,
    };
  }

  /**
   * Processa uma lista de variáveis para apresentação segura na interface do cliente (mascarando secrets)
   */
  public static sanitizeForClient(
    envs: Array<{ key: string; value: string; [k: string]: any }>,
    templateOverrides: Record<string, Partial<EnvVarMetadata>> = {}
  ): EnvVarMetadata[] {
    return envs.map((env) => {
      const meta = this.classifyVariable(env.key, env.value, templateOverrides[env.key]);
      return {
        ...meta,
        value: meta.isSecret ? "••••••••" : env.value,
      };
    });
  }

  /**
   * Valida se todas as variáveis obrigatórias foram preenchidas antes do build
   */
  public static validateRequiredEnvs(
    envs: Array<{ key: string; value: string }>,
    requiredKeys: string[]
  ): { isValid: boolean; missingKeys: string[] } {
    const envMap = new Map(envs.map((e) => [e.key.trim().toUpperCase(), e.value]));
    const missingKeys: string[] = [];

    for (const reqKey of requiredKeys) {
      const cleanReq = reqKey.trim().toUpperCase();
      const val = envMap.get(cleanReq);
      if (!val || val.trim() === "" || val.includes("SEU_") || val.includes("AQUI")) {
        missingKeys.push(reqKey);
      }
    }

    return {
      isValid: missingKeys.length === 0,
      missingKeys,
    };
  }

  /**
   * Verifica se a alteração em uma variável exige rebuild completo do projeto
   */
  public static checkIfRebuildRequired(
    oldEnvs: Array<{ key: string; value: string }>,
    newEnvs: Array<{ key: string; value: string }>
  ): { requiresRebuild: boolean; changedBuildVars: string[] } {
    const oldMap = new Map(oldEnvs.map((e) => [e.key.trim(), e.value]));
    const changedBuildVars: string[] = [];

    for (const newEnv of newEnvs) {
      const meta = this.classifyVariable(newEnv.key, newEnv.value);
      const oldVal = oldMap.get(newEnv.key.trim());

      if (meta.requiresRebuild && oldVal !== undefined && oldVal !== newEnv.value) {
        changedBuildVars.push(newEnv.key.trim());
      }
    }

    return {
      requiresRebuild: changedBuildVars.length > 0,
      changedBuildVars,
    };
  }
}
