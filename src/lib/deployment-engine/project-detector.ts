import {
  DetectedProject,
  PackageManager,
  FrameworkType,
  NextJsVariant,
  NextJsRouter,
  ViteVariant,
  NodeFramework,
} from "./types";

export interface ProjectAnalysisInput {
  files?: string[];
  packageJson?: {
    name?: string;
    version?: string;
    main?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    [key: string]: any;
  } | null;
  nextConfigContent?: string;
  viteConfigContent?: string;
}

export class ProjectDetector {
  /**
   * Detecta o gerenciador de pacotes a partir da lista de arquivos
   */
  public static detectPackageManager(files: string[] = []): {
    packageManager: PackageManager;
    lockfilesFound: string[];
    hasMultipleLockfiles: boolean;
    lockfileWarning?: string;
  } {
    const lockfilesFound: string[] = [];

    const hasBun = files.some((f) => f === "bun.lock" || f === "bun.lockb" || f.endsWith("/bun.lock") || f.endsWith("/bun.lockb"));
    const hasPnpm = files.some((f) => f === "pnpm-lock.yaml" || f.endsWith("/pnpm-lock.yaml"));
    const hasYarn = files.some((f) => f === "yarn.lock" || f.endsWith("/yarn.lock"));
    const hasNpm = files.some((f) => f === "package-lock.json" || f.endsWith("/package-lock.json"));

    if (hasBun) lockfilesFound.push("bun.lock");
    if (hasPnpm) lockfilesFound.push("pnpm-lock.yaml");
    if (hasYarn) lockfilesFound.push("yarn.lock");
    if (hasNpm) lockfilesFound.push("package-lock.json");

    let packageManager: PackageManager = "npm";
    const hasMultipleLockfiles = lockfilesFound.length > 1;
    let lockfileWarning: string | undefined;

    if (hasMultipleLockfiles) {
      lockfileWarning = `Foram detectados múltiplos lockfiles (${lockfilesFound.join(", ")}). O gerenciador '${lockfilesFound[0].split("-")[0].split(".")[0]}' foi selecionado como prioritário. Recomenda-se manter apenas um lockfile no repositório.`;
    }

    if (hasBun) {
      packageManager = "bun";
    } else if (hasPnpm) {
      packageManager = "pnpm";
    } else if (hasYarn) {
      packageManager = "yarn";
    } else if (hasNpm) {
      packageManager = "npm";
    } else {
      packageManager = "npm"; // Fallback padrão
    }

    return {
      packageManager,
      lockfilesFound,
      hasMultipleLockfiles,
      lockfileWarning,
    };
  }

  /**
   * Analisa a estrutura e o código do projeto para extrair todas as características
   */
  public static analyze(input: ProjectAnalysisInput): DetectedProject {
    const files = input.files || [];
    const pkg = input.packageJson || {};
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const scripts = pkg.scripts || {};

    const { packageManager, lockfilesFound, hasMultipleLockfiles, lockfileWarning } =
      this.detectPackageManager(files);

    // 1. Detecção de Docker explícito
    const hasDockerfile = files.some((f) => f.toLowerCase() === "dockerfile" || f.toLowerCase().endsWith("/dockerfile"));
    const hasCompose = files.some(
      (f) =>
        f.toLowerCase() === "docker-compose.yml" ||
        f.toLowerCase() === "docker-compose.yaml" ||
        f.toLowerCase() === "compose.yaml" ||
        f.toLowerCase() === "compose.yml"
    );

    if (hasCompose) {
      return {
        packageManager,
        lockfilesFound,
        hasMultipleLockfiles,
        lockfileWarning,
        framework: "docker_compose",
        hasBuildScript: false,
        hasStartScript: false,
        scripts,
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
        defaultPort: 80,
      };
    }

    if (hasDockerfile && !deps.next && !deps.vite) {
      return {
        packageManager,
        lockfilesFound,
        hasMultipleLockfiles,
        lockfileWarning,
        framework: "dockerfile",
        hasBuildScript: false,
        hasStartScript: false,
        scripts,
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
        defaultPort: 80,
      };
    }

    // 2. Detecção de Next.js
    const isNext =
      Boolean(deps.next) ||
      files.some((f) => f.startsWith("next.config.") || f.includes("/next.config."));

    if (isNext) {
      const nextVersion = deps.next || "latest";

      // Detecção de Roteador (App Router vs Pages Router)
      const hasAppRouter = files.some((f) => f.startsWith("app/") || f.startsWith("src/app/"));
      const hasPagesRouter = files.some((f) => f.startsWith("pages/") || f.startsWith("src/pages/"));
      let nextRouter: NextJsRouter = "unknown";
      if (hasAppRouter && hasPagesRouter) nextRouter = "both";
      else if (hasAppRouter) nextRouter = "app_router";
      else if (hasPagesRouter) nextRouter = "pages_router";

      // Detecção de Variante (Standalone, Static Export, SSR)
      let nextVariant: NextJsVariant = "ssr";
      const configStr = input.nextConfigContent || "";
      const buildScript = scripts.build || "";

      if (configStr.includes(`output: "standalone"`) || configStr.includes(`output: 'standalone'`)) {
        nextVariant = "standalone";
      } else if (
        configStr.includes(`output: "export"`) ||
        configStr.includes(`output: 'export'`) ||
        buildScript.includes("next export")
      ) {
        nextVariant = "static_export";
      }

      return {
        packageManager,
        lockfilesFound,
        hasMultipleLockfiles,
        lockfileWarning,
        framework: "nextjs",
        version: nextVersion,
        nextVariant,
        nextRouter,
        hasBuildScript: Boolean(scripts.build),
        hasStartScript: Boolean(scripts.start),
        scripts,
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
        defaultPort: nextVariant === "static_export" ? 80 : 3000,
      };
    }

    // 3. Detecção de React / Vite
    const isVite =
      Boolean(deps.vite) ||
      files.some((f) => f.startsWith("vite.config.") || f.includes("/vite.config."));

    if (isVite) {
      // Diferenciar Vite SPA de Vite SSR
      const hasServerEntry = files.some(
        (f) =>
          f === "server.js" ||
          f === "server.ts" ||
          f.includes("entry-server") ||
          f === "src/server.ts"
      );
      const isViteSSR = hasServerEntry && (scripts.start || scripts["serve:ssr"]);
      const viteVariant: ViteVariant = isViteSSR ? "ssr" : "spa";

      return {
        packageManager,
        lockfilesFound,
        hasMultipleLockfiles,
        lockfileWarning,
        framework: "react_vite",
        viteVariant,
        hasBuildScript: Boolean(scripts.build),
        hasStartScript: Boolean(scripts.start),
        scripts,
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
        defaultPort: viteVariant === "spa" ? 80 : 3000,
      };
    }

    // 4. Detecção de Node.js (APIs / Workers / Express / Fastify / NestJS / Hono)
    let nodeFramework: NodeFramework = "vanilla";
    if (deps["@nestjs/core"]) nodeFramework = "nestjs";
    else if (deps.fastify) nodeFramework = "fastify";
    else if (deps.express) nodeFramework = "express";
    else if (deps.hono) nodeFramework = "hono";
    else if (deps.koa) nodeFramework = "koa";
    else if (deps.typescript || files.some((f) => f.endsWith(".ts"))) nodeFramework = "typescript";

    // Encontrar Entrypoint
    let entrypoint: string | undefined;
    const entryCandidates = [
      pkg.main,
      "index.js",
      "server.js",
      "main.js",
      "app.js",
      "src/index.ts",
      "src/main.ts",
      "src/index.js",
      "src/server.js",
      "dist/index.js",
      "dist/main.js",
    ].filter(Boolean);

    for (const candidate of entryCandidates) {
      if (candidate && files.some((f) => f === candidate || f.endsWith(`/${candidate}`))) {
        entrypoint = candidate;
        break;
      }
    }

    const isNode =
      Boolean(pkg.name) ||
      Boolean(pkg.main) ||
      Boolean(scripts.start) ||
      Boolean(scripts.build) ||
      Object.keys(deps).length > 0 ||
      Boolean(entrypoint);

    if (isNode) {
      return {
        packageManager,
        lockfilesFound,
        hasMultipleLockfiles,
        lockfileWarning,
        framework: "node_api",
        nodeFramework,
        entrypoint,
        hasBuildScript: Boolean(scripts.build),
        hasStartScript: Boolean(scripts.start),
        scripts,
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
        defaultPort: 3000,
      };
    }

    // 5. Detecção de HTML Estático Puro
    const hasHtml = files.some((f) => f === "index.html" || f.endsWith("/index.html"));
    if (hasHtml) {
      return {
        packageManager: "npm",
        lockfilesFound: [],
        hasMultipleLockfiles: false,
        framework: "static_html",
        hasBuildScript: false,
        hasStartScript: false,
        scripts: {},
        dependencies: {},
        devDependencies: {},
        defaultPort: 80,
      };
    }

    return {
      packageManager: "npm",
      lockfilesFound: [],
      hasMultipleLockfiles: false,
      framework: "unknown",
      hasBuildScript: false,
      hasStartScript: false,
      scripts: {},
      dependencies: {},
      devDependencies: {},
      defaultPort: 80,
    };
  }
}
