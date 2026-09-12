import path from "path";
import { validateSafePath, sanitizeFileName } from "../src/lib/file-manager/security.ts";

console.log("=== RED TEAM: TESTE ADVERSARIAL DE FILESYSTEM E PATH TRAVERSAL ===");

const fakeSandboxRoot = path.resolve(process.cwd(), "storage", "apps", "test-sandbox-app", "public_html");

const traversalPayloads = [
  "../",
  "../../",
  "../../../",
  "../../../../../../etc/passwd",
  "/etc/passwd",
  "/root",
  "/tmp",
  "/var/lib/docker",
  "/home",
  "/home/other-user",
  "../../.env",
  "....//....//....//etc/passwd",
  "%2e%2e%2f",
  "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
  "%252e%252e%252f",
  "..\\..\\windows\\system32",
  "test/../../../etc/shadow",
  "test\0/../../etc/passwd",
  "..\x00/../secret.txt",
];

let passed = 0;
let failed = 0;

for (const payload of traversalPayloads) {
  try {
    const resolved = await validateSafePath(fakeSandboxRoot, payload);
    // Se não lançou erro, verificar se escapou do sandbox
    const rel = path.relative(fakeSandboxRoot, resolved);
    if (rel.startsWith("..") || path.isAbsolute(rel) || resolved === "/etc/passwd" || resolved === "/root") {
      console.error(`❌ FALHA CRÍTICA no payload [${payload}]: Escapou para "${resolved}"!`);
      failed++;
    } else {
      console.log(`✅ APROVADO: Resolvido com segurança dentro do sandbox: "${payload}" -> "${rel}"`);
      passed++;
    }
  } catch (err) {
    if (err.message.includes("Acesso negado") || err.message.includes("inválidos")) {
      console.log(`✅ APROVADO [${payload}]: Bloqueado com sucesso ("${err.message.slice(0, 70)}")`);
      passed++;
    } else {
      console.log(`✅ APROVADO [${payload}]: Rejeitado com erro ("${err.message.slice(0, 70)}")`);
      passed++;
    }
  }
}

// Teste de nomes de arquivos maliciosos
console.log("\n--- Testando Nomes Maliciosos com sanitizeFileName ---");
const badFileNames = [
  "../../evil.sh",
  "..",
  ".",
  "file/with/slash",
  "file\\with\\backslash",
  "file<with>symbols",
  "file\0nullbyte.txt",
  "|calc.exe",
];

for (const badName of badFileNames) {
  try {
    sanitizeFileName(badName);
    console.error(`❌ FALHA: Nome malicioso [${badName}] foi aceito!`);
    failed++;
  } catch (err) {
    console.log(`✅ APROVADO [${badName}]: Bloqueado ("${err.message}")`);
    passed++;
  }
}

console.log(`\nResultado Red Team Filesystem: ${passed}/${passed + failed} aprovados`);
if (failed > 0) process.exit(1);
