import { execSync } from "child_process";
import fs from "fs";

console.log("\n========================================================");
console.log("🛡️  PIPELINE DE HOMOLOGAÇÃO & BLINDAGEM - EQSAM PAINEL");
console.log("========================================================\n");

function runStage(name, command) {
  console.log(`\n▶️  [ETAPA] ${name}...`);
  console.log(`   Comando: ${command}`);
  const startTime = Date.now();
  try {
    execSync(command, {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   ✅ SUCESSO (${elapsed}s)`);
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n❌ FALHA NA ETAPA: ${name} (${elapsed}s)`);
    console.error(`   O processo de verificação foi interrompido.`);
    process.exit(1);
  }
}

// 1. Verificação de Tipos TypeScript (Sintaxe, Interfaces e Contratos)
runStage("1. Verificação de Tipos TypeScript (npx tsc --noEmit)", "npx tsc --noEmit");

// 2. Execução da Suíte de Testes Automatizados de Regressão (Vitest)
runStage("2. Testes de Regressão Automatizados (Vitest)", "npx vitest run tests/regression");

// 3. Validação Real de Queries contra o Supabase (21 Tabelas Públicas)
runStage("3. Validação de Integridade no Banco de Dados (test-all-queries)", "node scripts/test-all-queries.mjs");

console.log("\n========================================================");
console.log("🎉  TODOS OS 3 NÍVEIS DE DEFESA FORAM VALIDADOS COM SUCESSO!");
console.log("    O código está estável, tipado e blindado contra regressões.");
console.log("========================================================\n");
process.exit(0);
