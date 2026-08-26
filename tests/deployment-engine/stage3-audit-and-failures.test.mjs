import { ProjectDetector } from "../../src/lib/deployment-engine/project-detector.js";
import { BuildStrategyResolver } from "../../src/lib/deployment-engine/build-strategy.js";
import { DeploymentDiagnosticsService } from "../../src/lib/deployment-engine/diagnostics.js";
import { HealthcheckManager } from "../../src/lib/deployment-engine/healthcheck.js";
import { DomainVerificationManager } from "../../src/lib/deployment-engine/domain-verifier.js";
import http from "http";

async function runStage3AuditAndFailuresTests() {
  console.log("==================================================");
  console.log("ETAPA 3.1 — AUDITORIA, HOMOLOGAÇÃO E TESTE DE FALHAS");
  console.log("==================================================");

  // -----------------------------------------------------------------
  // 1. Next.js SSR + App Router
  // -----------------------------------------------------------------
  console.log("\n▶ [TESTE 1]: Next.js SSR + App Router");
  const nextApp = ProjectDetector.analyze({
    files: ["package.json", "package-lock.json", "app/page.tsx", "app/layout.tsx", "next.config.js"],
    packageJson: {
      dependencies: { next: "14.2.5", react: "18.3.1" },
      scripts: { build: "next build", start: "next start" },
    },
  });
  const nextAppStrategy = BuildStrategyResolver.resolve(nextApp, 3000);
  if (
    nextApp.framework !== "nextjs" ||
    nextApp.nextRouter !== "app_router" ||
    !nextAppStrategy.startCommand.includes("-H 0.0.0.0 -p 3000") ||
    nextAppStrategy.environment.HOSTNAME !== "0.0.0.0" ||
    nextAppStrategy.installCommand !== "npm ci"
  ) {
    throw new Error(`Falha no Teste 1: ${JSON.stringify(nextAppStrategy)}`);
  }
  console.log("  ✔ Next.js SSR + App Router + npm ci + 0.0.0.0: PASS");

  // -----------------------------------------------------------------
  // 2. Next.js Pages Router
  // -----------------------------------------------------------------
  console.log("\n▶ [TESTE 2]: Next.js Pages Router");
  const nextPages = ProjectDetector.analyze({
    files: ["package.json", "yarn.lock", "pages/index.tsx", "pages/_app.tsx", "next.config.js"],
    packageJson: {
      dependencies: { next: "13.5.6", react: "18.2.0" },
      scripts: { build: "next build", start: "next start" },
    },
  });
  const nextPagesStrategy = BuildStrategyResolver.resolve(nextPages, 3000);
  if (nextPages.nextRouter !== "pages_router" || nextPagesStrategy.packageManager !== "yarn") {
    throw new Error(`Falha no Teste 2: ${JSON.stringify(nextPagesStrategy)}`);
  }
  console.log("  ✔ Next.js Pages Router + yarn: PASS");

  // -----------------------------------------------------------------
  // 3. Next.js Standalone
  // -----------------------------------------------------------------
  console.log("\n▶ [TESTE 3]: Next.js Standalone (.next/standalone/server.js)");
  const nextStandalone = ProjectDetector.analyze({
    files: ["package.json", "pnpm-lock.yaml", "next.config.js"],
    packageJson: {
      dependencies: { next: "14.2.0" },
      scripts: { build: "next build" },
    },
    nextConfigContent: `module.exports = { output: "standalone" };`,
  });
  const nextStandaloneStrategy = BuildStrategyResolver.resolve(nextStandalone, 3000);
  if (
    nextStandalone.nextVariant !== "standalone" ||
    nextStandaloneStrategy.startCommand !== "node .next/standalone/server.js" ||
    nextStandaloneStrategy.entrypoint !== ".next/standalone/server.js"
  ) {
    throw new Error(`Falha no Teste 3: ${JSON.stringify(nextStandaloneStrategy)}`);
  }
  console.log("  ✔ Next.js Standalone Strategy: PASS");

  // -----------------------------------------------------------------
  // 4. Next.js Static Export
  // -----------------------------------------------------------------
  console.log("\n▶ [TESTE 4]: Next.js Static Export (out/ -> Caddy Port 80)");
  const nextExport = ProjectDetector.analyze({
    files: ["package.json", "pnpm-lock.yaml", "next.config.mjs"],
    packageJson: {
      dependencies: { next: "14.2.0" },
      scripts: { build: "next build" },
    },
    nextConfigContent: `export default { output: "export" };`,
  });
  const nextExportStrategy = BuildStrategyResolver.resolve(nextExport);
  if (
    nextExport.nextVariant !== "static_export" ||
    nextExportStrategy.runtime !== "static" ||
    nextExportStrategy.outputDirectory !== "out" ||
    nextExportStrategy.port !== 80
  ) {
    throw new Error(`Falha no Teste 4: ${JSON.stringify(nextExportStrategy)}`);
  }
  console.log("  ✔ Next.js Static Export + Caddy: PASS");

  // -----------------------------------------------------------------
  // 5. React + Vite SPA (dist/ -> Caddy)
  // -----------------------------------------------------------------
  console.log("\n▶ [TESTE 5]: React + Vite SPA Estático");
  const viteSpa = ProjectDetector.analyze({
    files: ["package.json", "package-lock.json", "vite.config.ts", "src/App.tsx", "index.html"],
    packageJson: {
      dependencies: { react: "18.3.1" },
      devDependencies: { vite: "5.4.0" },
      scripts: { build: "vite build" },
    },
  });
  const viteSpaStrategy = BuildStrategyResolver.resolve(viteSpa);
  if (
    viteSpa.framework !== "react_vite" ||
    viteSpa.viteVariant !== "spa" ||
    viteSpaStrategy.outputDirectory !== "dist" ||
    viteSpaStrategy.port !== 80
  ) {
    throw new Error(`Falha no Teste 5: ${JSON.stringify(viteSpaStrategy)}`);
  }
  console.log("  ✔ React + Vite SPA + Caddy dist/: PASS");

  // -----------------------------------------------------------------
  // 6. Vite SSR
  // -----------------------------------------------------------------
  console.log("\n▶ [TESTE 6]: Vite SSR Dinâmico");
  const viteSsr = ProjectDetector.analyze({
    files: ["package.json", "yarn.lock", "vite.config.ts", "server.js", "src/entry-server.tsx"],
    packageJson: {
      dependencies: { express: "4.19.2", react: "18.3.1" },
      devDependencies: { vite: "5.4.0" },
      scripts: { build: "vite build", start: "node server.js" },
    },
  });
  const viteSsrStrategy = BuildStrategyResolver.resolve(viteSsr, 3000);
  if (viteSsr.viteVariant !== "ssr" || viteSsrStrategy.runtime !== "nixpacks" || viteSsrStrategy.port !== 3000) {
    throw new Error(`Falha no Teste 6: ${JSON.stringify(viteSsrStrategy)}`);
  }
  console.log("  ✔ Vite SSR com Node Runtime: PASS");

  // -----------------------------------------------------------------
  // 7. Express API
  // -----------------------------------------------------------------
  console.log("\n▶ [TESTE 7]: Express REST API");
  const expressApp = ProjectDetector.analyze({
    files: ["package.json", "package-lock.json", "index.js"],
    packageJson: {
      dependencies: { express: "4.19.2" },
      scripts: { start: "node index.js" },
    },
  });
  const expressStrategy = BuildStrategyResolver.resolve(expressApp, 4000);
  if (
    expressApp.nodeFramework !== "express" ||
    expressStrategy.port !== 4000 ||
    expressStrategy.environment.PORT !== "4000" ||
    expressStrategy.environment.HOST !== "0.0.0.0"
  ) {
    throw new Error(`Falha no Teste 7: ${JSON.stringify(expressStrategy)}`);
  }
  console.log("  ✔ Express API + Porta Dinâmica (4000) + 0.0.0.0: PASS");

  // -----------------------------------------------------------------
  // 8. Fastify API
  // -----------------------------------------------------------------
  console.log("\n▶ [TESTE 8]: Fastify REST API");
  const fastifyApp = ProjectDetector.analyze({
    files: ["package.json", "pnpm-lock.yaml", "server.js"],
    packageJson: {
      dependencies: { fastify: "4.28.1" },
      scripts: { start: "node server.js" },
    },
  });
  const fastifyStrategy = BuildStrategyResolver.resolve(fastifyApp, 5000);
  if (
    fastifyApp.nodeFramework !== "fastify" ||
    fastifyStrategy.port !== 5000 ||
    fastifyStrategy.packageManager !== "pnpm"
  ) {
    throw new Error(`Falha no Teste 8: ${JSON.stringify(fastifyStrategy)}`);
  }
  console.log("  ✔ Fastify API + pnpm + Porta Dinâmica (5000): PASS");

  // -----------------------------------------------------------------
  // 9. NestJS API
  // -----------------------------------------------------------------
  console.log("\n▶ [TESTE 9]: NestJS API");
  const nestApp = ProjectDetector.analyze({
    files: ["package.json", "package-lock.json", "src/main.ts"],
    packageJson: {
      dependencies: { "@nestjs/core": "10.3.10" },
      scripts: { build: "nest build", start: "nest start" },
    },
  });
  const nestStrategy = BuildStrategyResolver.resolve(nestApp, 3000);
  if (nestApp.nodeFramework !== "nestjs" || nestStrategy.buildCommand !== "npm run build") {
    throw new Error(`Falha no Teste 9: ${JSON.stringify(nestStrategy)}`);
  }
  console.log("  ✔ NestJS API + nest build: PASS");

  // -----------------------------------------------------------------
  // 10. TypeScript Worker
  // -----------------------------------------------------------------
  console.log("\n▶ [TESTE 10]: TypeScript Worker / Bot");
  const tsWorker = ProjectDetector.analyze({
    files: ["package.json", "bun.lockb", "src/index.ts", "tsconfig.json"],
    packageJson: {
      devDependencies: { typescript: "5.5.4" },
    },
  });
  const tsStrategy = BuildStrategyResolver.resolve(tsWorker, 8080);
  if (!tsStrategy.startCommand.includes("tsx src/index.ts") && !tsStrategy.startCommand.includes("src/index.ts")) {
    throw new Error(`Falha no Teste 10: ${JSON.stringify(tsStrategy)}`);
  }
  console.log("  ✔ TypeScript Worker via tsx: PASS");

  // -----------------------------------------------------------------
  // 11. TESTES DE FALHAS E DIAGNÓSTICOS
  // -----------------------------------------------------------------
  console.log("\n▶ [TESTES DE FALHAS INTENCIONAIS & DIAGNÓSTICO]:");

  // 11.1 Múltiplos lockfiles conflitantes
  const conflict = ProjectDetector.detectPackageManager(["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]);
  if (!conflict.hasMultipleLockfiles || !conflict.lockfileWarning) {
    throw new Error("Falha ao gerar warning de lockfiles conflitantes");
  }
  console.log("  ✔ Falha 1: Diagnóstico de lockfiles conflitantes gerado com sucesso: PASS");

  // 11.2 Projeto sem script start (fallback de entrypoint)
  const noStartScript = ProjectDetector.analyze({
    files: ["package.json", "server.js"],
    packageJson: { name: "custom-api" },
  });
  const noStartStrategy = BuildStrategyResolver.resolve(noStartScript, 3000);
  if (noStartStrategy.startCommand !== "node server.js") {
    throw new Error(`Falha no fallback de start command: ${noStartStrategy.startCommand}`);
  }
  console.log("  ✔ Falha 2: Fallback automático de start script para entrypoint: PASS");

  // 11.3 Diagnóstico de 502 Bad Gateway
  const diag502 = DeploymentDiagnosticsService.diagnose("HTTP 502 Bad Gateway ao conectar no container");
  if (diag502.code !== "ERR_BAD_GATEWAY_502" || !diag502.possibleCause.includes("0.0.0.0")) {
    throw new Error(`Falha no diagnóstico de 502: ${JSON.stringify(diag502)}`);
  }
  console.log("  ✔ Falha 3: Diagnóstico de 502 Bad Gateway com ação recomendada: PASS");

  // 11.4 Diagnóstico de porta ocupada (EADDRINUSE)
  const diagPort = DeploymentDiagnosticsService.diagnose("Error: listen EADDRINUSE: address already in use :::3000");
  if (diagPort.code !== "ERR_ADDR_IN_USE" || diagPort.action?.type !== "fix_port") {
    throw new Error(`Falha no diagnóstico de porta ocupada: ${JSON.stringify(diagPort)}`);
  }
  console.log("  ✔ Falha 4: Diagnóstico de EADDRINUSE com ação de fix_port: PASS");

  // 11.5 Healthcheck HTTP rejeitando status 500
  const server500 = http.createServer((req, res) => {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  });
  await new Promise((resolve) => server500.listen(9888, "127.0.0.1", resolve));

  try {
    const health500 = await HealthcheckManager.check("http://127.0.0.1:9888", {
      type: "http",
      path: "/",
      expectedStatus: [200, 304],
      timeoutSeconds: 2,
      retries: 2,
    });
    if (health500.isHealthy) {
      throw new Error("Healthcheck não rejeitou resposta 500!");
    }
    console.log("  ✔ Falha 5: Healthcheck HTTP rejeitou 500 com status UNHEALTHY: PASS");
  } finally {
    server500.close();
  }

  console.log("\n==================================================");
  console.log("🎉 AUDITORIA DA ETAPA 3.1 CONCLUÍDA COM 100% DE SUCESSO!");
  console.log("==================================================");
}

runStage3AuditAndFailuresTests().catch((err) => {
  console.error("❌ ERRO NA AUDITORIA:", err.message);
  process.exit(1);
});
