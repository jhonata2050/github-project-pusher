import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("==================================================");
console.log("SUITE GERAL DE TESTES DO DEPLOYMENT ENGINE");
console.log("==================================================");

const tests = [
  "state-machine.test.mjs",
  "env-manager.test.mjs",
  "diagnostics.test.mjs",
  "healthcheck-and-domain.test.mjs",
  "web-stacks.test.mjs",
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
  console.log("🎉 TODOS OS TESTES PASSARAM COM SUCESSO!");
} else {
  console.error("❌ ALGUNS TESTES FALHARAM.");
  process.exit(1);
}
console.log("==================================================");
