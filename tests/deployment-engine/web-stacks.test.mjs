import { ProjectDetector } from "../../src/lib/deployment-engine/project-detector.js";
import { BuildStrategyResolver } from "../../src/lib/deployment-engine/build-strategy.js";

function runWebStacksTests() {
  console.log("==================================================");
  console.log("TESTES DE DETECÇÃO E ESTRATÉGIA DAS STACKS WEB");
  console.log("==================================================");

  // -------------------------------------------------------------
  // 1. TESTES DE PACKAGE MANAGERS
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 1]: Detecção Estrita de Package Managers");

  const npmProj = ProjectDetector.detectPackageManager(["package.json", "package-lock.json"]);
  if (npmProj.packageManager !== "npm") throw new Error(`Expected npm, got ${npmProj.packageManager}`);

  const yarnProj = ProjectDetector.detectPackageManager(["package.json", "yarn.lock"]);
  if (yarnProj.packageManager !== "yarn") throw new Error(`Expected yarn, got ${yarnProj.packageManager}`);

  const pnpmProj = ProjectDetector.detectPackageManager(["package.json", "pnpm-lock.yaml"]);
  if (pnpmProj.packageManager !== "pnpm") throw new Error(`Expected pnpm, got ${pnpmProj.packageManager}`);

  const bunProj = ProjectDetector.detectPackageManager(["package.json", "bun.lockb"]);
  if (bunProj.packageManager !== "bun") throw new Error(`Expected bun, got ${bunProj.packageManager}`);

  // Teste de múltiplos lockfiles conflitantes
  const multiProj = ProjectDetector.detectPackageManager(["pnpm-lock.yaml", "package-lock.json"]);
  if (!multiProj.hasMultipleLockfiles || !multiProj.lockfileWarning) {
    throw new Error("Expected warning on multiple conflicting lockfiles");
  }
  console.log("  ✔ Package Managers (npm, yarn, pnpm, bun, multi-lockfile): PASS");

  // -------------------------------------------------------------
  // 2. TESTES DE NEXT.JS (SSR, APP ROUTER, PAGES ROUTER, STANDALONE, EXPORT)
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 2]: Next.js (SSR, App Router, Pages Router, Standalone, Static Export)");

  // 2.1 Next.js SSR + App Router
  const nextAppRouter = ProjectDetector.analyze({
    files: ["package.json", "yarn.lock", "app/page.tsx", "app/layout.tsx", "next.config.js"],
    packageJson: {
      dependencies: { next: "14.2.3", react: "18.2.0" },
      scripts: { build: "next build", start: "next start" },
    },
  });
  if (nextAppRouter.framework !== "nextjs" || nextAppRouter.nextRouter !== "app_router" || nextAppRouter.nextVariant !== "ssr") {
    throw new Error(`Expected nextjs App Router SSR, got ${JSON.stringify(nextAppRouter)}`);
  }
  const nextSsrStrategy = BuildStrategyResolver.resolve(nextAppRouter, 3000);
  if (!nextSsrStrategy.startCommand.includes("-H 0.0.0.0 -p 3000") || nextSsrStrategy.environment.HOSTNAME !== "0.0.0.0") {
    throw new Error(`Expected 0.0.0.0 binding in Next.js start command, got ${nextSsrStrategy.startCommand}`);
  }

  // 2.2 Next.js Pages Router
  const nextPagesRouter = ProjectDetector.analyze({
    files: ["package.json", "package-lock.json", "pages/index.tsx", "pages/_app.tsx"],
    packageJson: {
      dependencies: { next: "13.5.6", react: "18.2.0" },
      scripts: { build: "next build", start: "next start" },
    },
  });
  if (nextPagesRouter.nextRouter !== "pages_router") {
    throw new Error(`Expected pages_router, got ${nextPagesRouter.nextRouter}`);
  }

  // 2.3 Next.js Standalone Output
  const nextStandalone = ProjectDetector.analyze({
    files: ["package.json", "pnpm-lock.yaml", "next.config.js"],
    packageJson: {
      dependencies: { next: "14.2.0" },
      scripts: { build: "next build" },
    },
    nextConfigContent: `module.exports = { output: "standalone" };`,
  });
  if (nextStandalone.nextVariant !== "standalone") {
    throw new Error(`Expected standalone variant, got ${nextStandalone.nextVariant}`);
  }
  const nextStandaloneStrategy = BuildStrategyResolver.resolve(nextStandalone, 3000);
  if (nextStandaloneStrategy.startCommand !== "node .next/standalone/server.js") {
    throw new Error(`Expected node .next/standalone/server.js, got ${nextStandaloneStrategy.startCommand}`);
  }

  // 2.4 Next.js Static Export Output
  const nextExport = ProjectDetector.analyze({
    files: ["package.json", "pnpm-lock.yaml", "next.config.mjs"],
    packageJson: {
      dependencies: { next: "14.2.0" },
      scripts: { build: "next build" },
    },
    nextConfigContent: `export default { output: "export" };`,
  });
  if (nextExport.nextVariant !== "static_export") {
    throw new Error(`Expected static_export variant, got ${nextExport.nextVariant}`);
  }
  const nextExportStrategy = BuildStrategyResolver.resolve(nextExport);
  if (nextExportStrategy.runtime !== "static" || nextExportStrategy.outputDirectory !== "out" || nextExportStrategy.port !== 80) {
    throw new Error(`Expected static runtime with out/ directory on port 80, got ${JSON.stringify(nextExportStrategy)}`);
  }
  console.log("  ✔ Next.js (SSR, App Router, Pages Router, Standalone, Static Export): PASS");

  // -------------------------------------------------------------
  // 3. TESTES DE REACT / VITE (SPA vs SSR)
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 3]: React / Vite (SPA Estático vs SSR)");

  // 3.1 Vite SPA Estático
  const viteSpa = ProjectDetector.analyze({
    files: ["package.json", "package-lock.json", "vite.config.ts", "src/App.tsx", "index.html"],
    packageJson: {
      dependencies: { react: "18.2.0" },
      devDependencies: { vite: "5.2.0" },
      scripts: { build: "vite build" },
    },
  });
  if (viteSpa.framework !== "react_vite" || viteSpa.viteVariant !== "spa") {
    throw new Error(`Expected react_vite SPA, got ${JSON.stringify(viteSpa)}`);
  }
  const viteSpaStrategy = BuildStrategyResolver.resolve(viteSpa);
  if (viteSpaStrategy.runtime !== "static" || viteSpaStrategy.outputDirectory !== "dist" || viteSpaStrategy.port !== 80) {
    throw new Error(`Expected static runtime with dist/ on port 80, got ${JSON.stringify(viteSpaStrategy)}`);
  }

  // 3.2 Vite SSR Dinâmico
  const viteSsr = ProjectDetector.analyze({
    files: ["package.json", "yarn.lock", "vite.config.ts", "server.js", "src/entry-server.tsx"],
    packageJson: {
      dependencies: { express: "4.18.2", react: "18.2.0" },
      devDependencies: { vite: "5.2.0" },
      scripts: { build: "vite build", start: "node server.js" },
    },
  });
  if (viteSsr.viteVariant !== "ssr") {
    throw new Error(`Expected vite SSR, got ${viteSsr.viteVariant}`);
  }
  const viteSsrStrategy = BuildStrategyResolver.resolve(viteSsr, 3000);
  if (viteSsrStrategy.runtime !== "nixpacks" || viteSsrStrategy.port !== 3000) {
    throw new Error(`Expected nixpacks runtime on port 3000, got ${JSON.stringify(viteSsrStrategy)}`);
  }
  console.log("  ✔ React / Vite (SPA Estático & SSR): PASS");

  // -------------------------------------------------------------
  // 4. TESTES DE NODE.JS (EXPRESS, FASTIFY, NESTJS, TYPESCRIPT, ENTRYPOINTS)
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 4]: Node.js (Express, Fastify, NestJS, TypeScript, Entrypoints)");

  // 4.1 Express API com index.js
  const expressApi = ProjectDetector.analyze({
    files: ["package.json", "package-lock.json", "index.js"],
    packageJson: {
      dependencies: { express: "4.19.2" },
      scripts: { start: "node index.js" },
    },
  });
  if (expressApi.nodeFramework !== "express" || expressApi.entrypoint !== "index.js") {
    throw new Error(`Expected express with index.js, got ${JSON.stringify(expressApi)}`);
  }

  // 4.2 Fastify API com server.js
  const fastifyApi = ProjectDetector.analyze({
    files: ["package.json", "pnpm-lock.yaml", "server.js"],
    packageJson: {
      dependencies: { fastify: "4.26.0" },
      scripts: { start: "node server.js" },
    },
  });
  if (fastifyApi.nodeFramework !== "fastify" || fastifyApi.entrypoint !== "server.js") {
    throw new Error(`Expected fastify with server.js, got ${JSON.stringify(fastifyApi)}`);
  }

  // 4.3 NestJS API com dist/main.js
  const nestApi = ProjectDetector.analyze({
    files: ["package.json", "package-lock.json", "src/main.ts"],
    packageJson: {
      dependencies: { "@nestjs/core": "10.0.0" },
      scripts: { build: "nest build", start: "nest start" },
    },
  });
  if (nestApi.nodeFramework !== "nestjs") {
    throw new Error(`Expected nestjs, got ${nestApi.nodeFramework}`);
  }

  // 4.4 TypeScript Entrypoint sem script start
  const tsWorker = ProjectDetector.analyze({
    files: ["package.json", "bun.lockb", "src/index.ts", "tsconfig.json"],
    packageJson: {
      devDependencies: { typescript: "5.4.0" },
    },
  });
  const tsStrategy = BuildStrategyResolver.resolve(tsWorker, 8080);
  if (!tsStrategy.startCommand.includes("tsx src/index.ts") && !tsStrategy.startCommand.includes("src/index.ts")) {
    throw new Error(`Expected tsx execution for TypeScript entrypoint, got ${tsStrategy.startCommand}`);
  }
  console.log("  ✔ Node.js (Express, Fastify, NestJS, TypeScript, Entrypoints): PASS");

  console.log("\n==================================================");
  console.log("🎉 TODOS OS TESTES DAS STACKS WEB PASSARAM!");
  console.log("==================================================");
}

runWebStacksTests();
