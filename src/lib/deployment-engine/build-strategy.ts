import {
  DetectedProject,
  ResolvedBuildStrategy,
  PackageManager,
} from "./types";

export class BuildStrategyResolver {
  /**
   * Resolve a estratégia completa e determinística de build e runtime a partir do projeto detectado
   */
  public static resolve(project: DetectedProject, requestedPort?: number): ResolvedBuildStrategy {
    const pm = project.packageManager || "npm";
    const port = requestedPort || project.defaultPort || 3000;

    const installCommand = this.getInstallCommand(pm, project.lockfilesFound);

    // 1. ESTRATÉGIA: Next.js
    if (project.framework === "nextjs") {
      if (project.nextVariant === "static_export") {
        return {
          framework: "nextjs",
          runtime: "static",
          packageManager: pm,
          installCommand,
          buildCommand: project.hasBuildScript ? `${pm} run build` : `${pm} run build`,
          startCommand: "",
          outputDirectory: "out",
          port: 80,
          environment: {
            NODE_ENV: "production",
          },
          healthcheck: {
            type: "http",
            path: "/",
            port: 80,
            expectedStatus: [200, 304],
            timeoutSeconds: 5,
            retries: 4,
          },
          validationPolicy: {
            requireHealthcheck: true,
            requireDomainVerification: true,
            expectedDomainStatuses: [200, 304],
          },
        };
      }

      // Next.js Standalone
      if (project.nextVariant === "standalone") {
        return {
          framework: "nextjs",
          runtime: "nixpacks",
          packageManager: pm,
          installCommand,
          buildCommand: project.hasBuildScript ? `${pm} run build` : "npx next build",
          startCommand: "node .next/standalone/server.js",
          entrypoint: ".next/standalone/server.js",
          port,
          environment: {
            HOSTNAME: "0.0.0.0",
            HOST: "0.0.0.0",
            PORT: String(port),
            NODE_ENV: "production",
          },
          healthcheck: {
            type: "http",
            path: "/",
            port,
            expectedStatus: [200, 304, 307, 308],
            timeoutSeconds: 8,
            retries: 5,
            startPeriodSeconds: 2,
          },
          validationPolicy: {
            requireHealthcheck: true,
            requireDomainVerification: true,
            expectedDomainStatuses: [200, 304, 307, 308],
          },
        };
      }

      // Next.js SSR Padrão
      const startCmd = project.hasStartScript
        ? `${pm} run start -- -H 0.0.0.0 -p ${port}`
        : `npx next start -H 0.0.0.0 -p ${port}`;

      return {
        framework: "nextjs",
        runtime: "nixpacks",
        packageManager: pm,
        installCommand,
        buildCommand: project.hasBuildScript ? `${pm} run build` : "npx next build",
        startCommand: startCmd,
        port,
        environment: {
          HOSTNAME: "0.0.0.0",
          HOST: "0.0.0.0",
          PORT: String(port),
          NODE_ENV: "production",
        },
        healthcheck: {
          type: "http",
          path: "/",
          port,
          expectedStatus: [200, 304, 307, 308],
          timeoutSeconds: 8,
          retries: 6,
          startPeriodSeconds: 3,
        },
        validationPolicy: {
          requireHealthcheck: true,
          requireDomainVerification: true,
          expectedDomainStatuses: [200, 304, 307, 308],
        },
      };
    }

    // 2. ESTRATÉGIA: React / Vite
    if (project.framework === "react_vite") {
      if (project.viteVariant === "ssr") {
        return {
          framework: "react_vite",
          runtime: "nixpacks",
          packageManager: pm,
          installCommand,
          buildCommand: project.hasBuildScript ? `${pm} run build` : null,
          startCommand: project.hasStartScript ? `${pm} run start` : `node server.js`,
          port,
          environment: {
            HOST: "0.0.0.0",
            PORT: String(port),
            NODE_ENV: "production",
          },
          healthcheck: {
            type: "http",
            path: "/",
            port,
            expectedStatus: [200, 304],
            timeoutSeconds: 6,
            retries: 4,
          },
          validationPolicy: {
            requireHealthcheck: true,
            requireDomainVerification: true,
          },
        };
      }

      // Vite SPA Estático (Publicado via Caddy com fallback de rotas SPA)
      return {
        framework: "react_vite",
        runtime: "static",
        packageManager: pm,
        installCommand,
        buildCommand: project.hasBuildScript ? `${pm} run build` : `${pm} run build`,
        startCommand: "",
        outputDirectory: "dist",
        port: 80,
        environment: {
          NODE_ENV: "production",
        },
        healthcheck: {
          type: "http",
          path: "/",
          port: 80,
          expectedStatus: [200, 304],
          timeoutSeconds: 5,
          retries: 4,
        },
        validationPolicy: {
          requireHealthcheck: true,
          requireDomainVerification: true,
          expectedDomainStatuses: [200, 304],
        },
      };
    }

    // 3. ESTRATÉGIA: Node.js (Express / Fastify / NestJS / APIs)
    if (project.framework === "node_api") {
      let startCmd = `${pm} run start`;

      if (project.hasStartScript) {
        startCmd = `${pm} run start`;
      } else if (project.entrypoint) {
        if (project.entrypoint.endsWith(".ts")) {
          startCmd = `npx tsx ${project.entrypoint}`;
        } else {
          startCmd = `node ${project.entrypoint}`;
        }
      } else {
        startCmd = "node index.js";
      }

      return {
        framework: "node_api",
        runtime: "nixpacks",
        packageManager: pm,
        installCommand,
        buildCommand: project.hasBuildScript ? `${pm} run build` : null,
        startCommand: startCmd,
        entrypoint: project.entrypoint,
        port,
        environment: {
          HOST: "0.0.0.0",
          PORT: String(port),
          NODE_ENV: "production",
        },
        healthcheck: {
          type: "http",
          path: "/",
          port,
          expectedStatus: [200, 201, 204, 301, 302, 304, 307, 308, 404], // 404 permitido se rota raiz não estiver implementada em API pura
          timeoutSeconds: 6,
          retries: 4,
        },
        validationPolicy: {
          requireHealthcheck: true,
          requireDomainVerification: true,
        },
      };
    }

    // 4. ESTRATÉGIA: HTML Estático Puro
    if (project.framework === "static_html") {
      return {
        framework: "static_html",
        runtime: "static",
        packageManager: "npm",
        installCommand: "",
        buildCommand: null,
        startCommand: "",
        outputDirectory: ".",
        port: 80,
        environment: {},
        healthcheck: {
          type: "http",
          path: "/",
          port: 80,
          expectedStatus: [200, 304],
          timeoutSeconds: 5,
          retries: 4,
        },
        validationPolicy: {
          requireHealthcheck: true,
          requireDomainVerification: true,
          expectedDomainStatuses: [200, 304],
        },
      };
    }

    // 5. ESTRATÉGIA: Dockerfile
    if (project.framework === "dockerfile") {
      return {
        framework: "dockerfile",
        runtime: "dockerfile",
        packageManager: pm,
        installCommand: "",
        buildCommand: null,
        startCommand: "",
        port,
        environment: {
          PORT: String(port),
        },
        healthcheck: {
          type: "http",
          path: "/",
          port,
          expectedStatus: [200, 201, 204, 301, 302, 304, 307, 308],
        },
        validationPolicy: {
          requireHealthcheck: true,
          requireDomainVerification: true,
        },
      };
    }

    // Fallback padrão
    return {
      framework: "unknown",
      runtime: "nixpacks",
      packageManager: pm,
      installCommand,
      buildCommand: project.hasBuildScript ? `${pm} run build` : null,
      startCommand: project.hasStartScript ? `${pm} run start` : "node index.js",
      port,
      environment: {
        HOST: "0.0.0.0",
        PORT: String(port),
        NODE_ENV: "production",
      },
      healthcheck: {
        type: "http",
        path: "/",
        port,
        expectedStatus: [200, 201, 204, 301, 302, 304],
      },
      validationPolicy: {
        requireHealthcheck: true,
        requireDomainVerification: true,
      },
    };
  }

  private static getInstallCommand(pm: PackageManager, lockfiles: string[] = []): string {
    switch (pm) {
      case "bun":
        return "bun install";
      case "pnpm":
        return "pnpm install";
      case "yarn":
        return "yarn install";
      case "npm":
      default:
        // Se package-lock.json estiver presente, npm ci garante builds determinísticos e reproduzíveis
        if (lockfiles.includes("package-lock.json")) {
          return "npm ci";
        }
        return "npm install";
    }
  }
}
