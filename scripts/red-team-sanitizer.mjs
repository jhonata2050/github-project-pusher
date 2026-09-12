import { sanitizeSecrets, sanitizeObject } from "../src/lib/secret-sanitizer.ts";

console.log("=== RED TEAM: TESTE ADVERSARIAL DO SECRET SANITIZER ===");

const testCases = [
  { name: "password=123456", input: "password=123456", forbidden: "123456" },
  { name: "PASSWORD=123456", input: "PASSWORD=123456", forbidden: "123456" },
  { name: "password : 123456", input: "password : 123456", forbidden: "123456" },
  { name: '"password":"123456"', input: '{"password":"123456"}', forbidden: "123456" },
  { name: "'password':'123456'", input: "{'password':'123456'}", forbidden: "123456" },
  { name: "DB_PASSWORD=123456", input: "DB_PASSWORD=123456", forbidden: "123456" },
  { name: "API_KEY=123456", input: "API_KEY=123456", forbidden: "123456" },
  { name: "api_key=123456", input: "api_key=123456", forbidden: "123456" },
  { name: "access_token=123456", input: "access_token=123456", forbidden: "123456" },
  { name: "token=123456", input: "token=123456", forbidden: "123456" },
  { name: "secret=123456", input: "secret=123456", forbidden: "123456" },
  { name: "Authorization: Bearer abc123", input: "Authorization: Bearer abc123", forbidden: "abc123" },
  { name: "Bearer abc123", input: "Bearer abc123", forbidden: "abc123" },
  { name: "postgres://user:password@host/db", input: "postgres://user:password@host:5432/db", forbidden: "password" },
  { name: "mysql://user:password@host/db", input: "mysql://user:password@host:3306/db", forbidden: "password" },
  { name: "mongodb://user:password@host/db", input: "mongodb://user:password@host:27017/db", forbidden: "password" },
  { name: "PRIVATE_KEY=secret_key_123", input: "PRIVATE_KEY=secret_key_123", forbidden: "secret_key_123" },
  {
    name: "-----BEGIN OPENSSH PRIVATE KEY-----",
    input: "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAA=\n-----END OPENSSH PRIVATE KEY-----",
    forbidden: "b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAA=",
  },
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = sanitizeSecrets(tc.input);
  const leaked = result.includes(tc.forbidden);
  if (leaked) {
    console.error(`❌ FALHA no caso [${tc.name}]: Segredo vazou! Saída: "${result}"`);
    failed++;
  } else {
    console.log(`✅ APROVADO [${tc.name}]: "${result}"`);
    passed++;
  }
}

// Teste adicional: Objetos aninhados e exceções
console.log("\n--- Testando Objetos Aninhados e Stack Traces ---");
const complexObj = {
  service: "mysql",
  config: {
    DB_PASSWORD: "super_secret_db_pass",
    auth: {
      tokens: ["token_12345", "token_67890"],
    },
  },
  error: "Failed to connect to postgres://app:mypassword999@db.eqsam.internal:5432/production",
};

const cleanObj = sanitizeObject(complexObj);
const stringified = JSON.stringify(cleanObj);

if (
  stringified.includes("super_secret_db_pass") ||
  stringified.includes("token_12345") ||
  stringified.includes("token_67890") ||
  stringified.includes("mypassword999")
) {
  console.error("❌ FALHA: Segredo encontrado no objeto sanitizado!");
  failed++;
} else {
  console.log("✅ APROVADO: Objeto complexo e strings aninhadas 100% limpos!");
  passed++;
}

console.log(`\nResultado Red Team Sanitizer: ${passed}/${passed + failed} aprovados`);
if (failed > 0) process.exit(1);
