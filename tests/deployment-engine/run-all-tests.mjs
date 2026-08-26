import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("==================================================");
console.log("SUITE DE TESTES DO DEPLOYMENT ENGINE (ETAPA 2)");
console.log("==================================================");

const tests = [
  "state-machine.test.mjs",
  "env-manager.test.mjs",
  "diagnostics.test.mjs",
  "healthcheck-and-domain.test.mjs",
];

let allPassed = true;

for (const testFile of tests) {
  const filePath = path.join(__dirname, testFile);
  try {
    execSync(`npx tsx "${filePath}"`, { stdio: "inherit" });
  } catch {
    console.error(`❌ Falha no teste: ${testFile}`);
    allPassed = false;
  }
}

console.log("==================================================");
if (allPassed) {
  console.log("🎉 TODOS OS TESTES UNITÁRIOS DO NÚCLEO PASSARAM!");
} else {
  console.error("❌ ALGUNS TESTES FALHARAM.");
  process.exit(1);
}
console.log("==================================================");
