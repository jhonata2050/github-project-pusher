import { EnvironmentManager } from "../../src/lib/deployment-engine/env-manager.js";

function runEnvManagerTests() {
  console.log("▶ [TEST]: Environment Manager Classification, Masking & Rebuild Detection");

  // 1. Classification of NEXT_PUBLIC_*
  const nextPub = EnvironmentManager.classifyVariable("NEXT_PUBLIC_API_URL", "https://api.domain.com");
  if (nextPub.type !== "public" || !nextPub.requiresRebuild) {
    throw new Error(`Expected NEXT_PUBLIC_API_URL to be public & require rebuild, got ${JSON.stringify(nextPub)}`);
  }

  // 2. Classification of DATABASE_URL and Secrets
  const dbUrl = EnvironmentManager.classifyVariable("DATABASE_URL", "postgres://user:pass@localhost:5432/db");
  if (dbUrl.type !== "secret" || !dbUrl.isSecret) {
    throw new Error(`Expected DATABASE_URL to be secret, got ${JSON.stringify(dbUrl)}`);
  }

  // 3. Client Sanitization & Masking
  const clientEnvs = EnvironmentManager.sanitizeForClient([
    { key: "DATABASE_PASSWORD", value: "super_secret_123" },
    { key: "PORT", value: "3000" },
  ]);
  const passEnv = clientEnvs.find((e) => e.key === "DATABASE_PASSWORD");
  const portEnv = clientEnvs.find((e) => e.key === "PORT");

  if (passEnv.value !== "••••••••") {
    throw new Error(`Expected DATABASE_PASSWORD value to be masked, got ${passEnv.value}`);
  }
  if (portEnv.value !== "3000") {
    throw new Error(`Expected PORT value to be unchanged, got ${portEnv.value}`);
  }

  // 4. Required Variable Validation
  const valResult = EnvironmentManager.validateRequiredEnvs(
    [{ key: "PORT", value: "3000" }],
    ["DISCORD_TOKEN"]
  );
  if (valResult.isValid || !valResult.missingKeys.includes("DISCORD_TOKEN")) {
    throw new Error(`Expected DISCORD_TOKEN to be reported as missing, got ${JSON.stringify(valResult)}`);
  }

  // 5. Rebuild Detection
  const rebuildCheck = EnvironmentManager.checkIfRebuildRequired(
    [{ key: "NEXT_PUBLIC_SITE_TITLE", value: "Old Title" }],
    [{ key: "NEXT_PUBLIC_SITE_TITLE", value: "New Title" }]
  );
  if (!rebuildCheck.requiresRebuild || !rebuildCheck.changedBuildVars.includes("NEXT_PUBLIC_SITE_TITLE")) {
    throw new Error(`Expected rebuild to be required for NEXT_PUBLIC_SITE_TITLE, got ${JSON.stringify(rebuildCheck)}`);
  }

  console.log("  ✔ Environment Manager: PASS");
}

runEnvManagerTests();
