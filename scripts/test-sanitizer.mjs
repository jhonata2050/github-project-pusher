import { sanitizeSecrets, sanitizeObject, maskSecretValue } from "../src/lib/secret-sanitizer.ts";

console.log("=== TESTANDO SECRET SANITIZER ===");

const raw1 = "ERRO: connection to postgres://postgres:eqsam_db_secret_pass@127.0.0.1:5432/eqsam failed with password=123456789 and token=abcefg123456";
const clean1 = sanitizeSecrets(raw1);
console.log("Raw 1:", raw1);
console.log("Clean 1:", clean1);

if (clean1.includes("eqsam_db_secret_pass") || clean1.includes("123456789") || clean1.includes("abcefg123456")) {
  console.error("FALHA: Segredos ainda presentes em clean1!");
  process.exit(1);
} else {
  console.log("SUCESSO: Todos os segredos foram mascarados!");
}

const obj = {
  name: "My App",
  password: "super_secret_password",
  env_vars: [
    { key: "DB_PASS", value: "pass123" }
  ],
  server: {
    ssh_password: "ssh_secret_pass",
    ip: "45.159.172.137"
  }
};

const cleanObj = sanitizeObject(obj);
console.log("Clean Obj:", JSON.stringify(cleanObj, null, 2));

if (cleanObj.password !== "******" || cleanObj.server.ssh_password !== "******") {
  console.error("FALHA: Objeto não foi sanitizado corretamente!");
  process.exit(1);
} else {
  console.log("SUCESSO: Objeto sanitizado com segurança!");
}
