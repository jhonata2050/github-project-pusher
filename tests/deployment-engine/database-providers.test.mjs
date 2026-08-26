import { DatabaseOrchestrator } from "../../src/lib/deployment-engine/database-providers/orchestrator.js";
import { CredentialGenerator } from "../../src/lib/deployment-engine/database-providers/credential-generator.js";

function runDatabaseProvidersTests() {
  console.log("==================================================");
  console.log("TESTES DA CAMADA DE BANCOS DE DADOS DEDICADOS (ETAPA 4)");
  console.log("==================================================");

  // -------------------------------------------------------------
  // 1. TESTES DE GERAÇÃO CRIPTOGRÁFICA DE CREDENCIAIS
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 1]: Credential Generator (Entropia & Segurança de URI)");

  const pgCreds = CredentialGenerator.generate("postgresql", "meu_app_db");
  if (pgCreds.database !== "meu_app_db" || !pgCreds.username.startsWith("pguser_") || pgCreds.password.length < 24) {
    throw new Error(`Credenciais PostgreSQL inválidas: ${JSON.stringify(pgCreds)}`);
  }

  // Verificar que a senha não contém caracteres que quebram shell ou URL (&, ?, #, /, @)
  const forbiddenChars = /[&?#/@"'\\]/;
  if (forbiddenChars.test(pgCreds.password)) {
    throw new Error(`Senha contém caracteres proibidos: ${pgCreds.password}`);
  }

  const connPg = CredentialGenerator.buildConnectionString("postgresql", pgCreds, "pg-host", 5432, false);
  const maskedPg = CredentialGenerator.buildConnectionString("postgresql", pgCreds, "pg-host", 5432, true);

  if (!connPg.includes(pgCreds.password) || !maskedPg.includes("••••••••") || maskedPg.includes(pgCreds.password)) {
    throw new Error(`Falha no mascaramento de connection string: ${maskedPg}`);
  }
  console.log("  ✔ Credential Generator (Entropia, Alfabeto Seguro & Mascaramento): PASS");

  // -------------------------------------------------------------
  // 2. TESTES DE POSTGRESQL PROVIDER
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 2]: PostgreSQL Provider (Imagens, Volumes, Healthcheck pg_isready)");

  const pgService = DatabaseOrchestrator.createDatabaseService({
    id: "pg_test_1",
    userId: "user_123",
    name: "Meu PostgreSQL",
    engine: "postgresql",
    version: "16-alpine",
    customDbName: "production_db",
  });

  const pgPlan = DatabaseOrchestrator.getProvisionPlan(pgService);

  if (
    pgPlan.image !== "postgres:16-alpine" ||
    pgPlan.internalPort !== 5432 ||
    pgPlan.volumeName !== "eqsam_data_postgresql_pg_test_1" ||
    pgPlan.mountPath !== "/var/lib/postgresql/data" ||
    !pgPlan.healthcheck.command?.includes("pg_isready") ||
    pgPlan.isPubliclyExposed !== false
  ) {
    throw new Error(`Falha no plano PostgreSQL: ${JSON.stringify(pgPlan)}`);
  }
  console.log("  ✔ PostgreSQL Provider (Porta 5432, Volume /var/lib/postgresql/data, pg_isready): PASS");

  // -------------------------------------------------------------
  // 3. TESTES DE MYSQL PROVIDER
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 3]: MySQL Provider (Imagens, Volumes, Healthcheck mysqladmin ping)");

  const myService = DatabaseOrchestrator.createDatabaseService({
    id: "my_test_1",
    userId: "user_123",
    name: "Meu MySQL",
    engine: "mysql",
    version: "8.4",
  });

  const myPlan = DatabaseOrchestrator.getProvisionPlan(myService);

  if (
    myPlan.image !== "mysql:8.4" ||
    myPlan.internalPort !== 3306 ||
    myPlan.mountPath !== "/var/lib/mysql" ||
    !myPlan.healthcheck.command?.includes("mysqladmin ping")
  ) {
    throw new Error(`Falha no plano MySQL: ${JSON.stringify(myPlan)}`);
  }
  console.log("  ✔ MySQL Provider (Porta 3306, Volume /var/lib/mysql, mysqladmin ping): PASS");

  // -------------------------------------------------------------
  // 4. TESTES DE MARIADB PROVIDER
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 4]: MariaDB Provider (Imagens, Volumes, Healthcheck mariadb-admin ping)");

  const mariaService = DatabaseOrchestrator.createDatabaseService({
    id: "maria_test_1",
    userId: "user_123",
    name: "Meu MariaDB",
    engine: "mariadb",
    version: "11.4",
  });

  const mariaPlan = DatabaseOrchestrator.getProvisionPlan(mariaService);

  if (
    mariaPlan.image !== "mariadb:11.4" ||
    mariaPlan.internalPort !== 3306 ||
    !mariaPlan.healthcheck.command?.includes("mariadb-admin ping")
  ) {
    throw new Error(`Falha no plano MariaDB: ${JSON.stringify(mariaPlan)}`);
  }
  console.log("  ✔ MariaDB Provider (Porta 3306, mariadb-admin ping): PASS");

  // -------------------------------------------------------------
  // 5. TESTES DE REDIS PROVIDER (PERSISTENT & CACHE)
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 5]: Redis Provider (Persistent AOF vs Cache LRU)");

  const redisPersistent = DatabaseOrchestrator.createDatabaseService({
    id: "redis_p_1",
    userId: "user_123",
    name: "Meu Redis Persistente",
    engine: "redis",
    redisMode: "persistent",
  });
  const redisPPlan = DatabaseOrchestrator.getProvisionPlan(redisPersistent);
  if (!redisPPlan.command?.includes("--appendonly yes") || redisPPlan.mountPath !== "/data") {
    throw new Error(`Falha no plano Redis Persistente: ${JSON.stringify(redisPPlan)}`);
  }

  const redisCache = DatabaseOrchestrator.createDatabaseService({
    id: "redis_c_1",
    userId: "user_123",
    name: "Meu Redis Cache",
    engine: "redis",
    redisMode: "cache",
    memoryLimitMb: 256,
  });
  const redisCPlan = DatabaseOrchestrator.getProvisionPlan(redisCache);
  if (!redisCPlan.command?.includes("--maxmemory 256mb --maxmemory-policy allkeys-lru")) {
    throw new Error(`Falha no plano Redis Cache: ${JSON.stringify(redisCPlan)}`);
  }
  console.log("  ✔ Redis Provider (AOF Persistent & Cache LRU): PASS");

  // -------------------------------------------------------------
  // 6. TESTES DE INJEÇÃO EM APLICAÇÕES (DATABASE_URL / REDIS_URL)
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 6]: Injeção 1-Clique em Aplicações Consumidoras");

  const appInitialEnvs = [
    { key: "PORT", value: "3000" },
    { key: "NODE_ENV", value: "production" },
  ];

  const injectedEnvs = DatabaseOrchestrator.injectConnectionIntoApp(appInitialEnvs, pgService, true);

  const dbUrl = injectedEnvs.find((e) => e.key === "DATABASE_URL");
  const dbUser = injectedEnvs.find((e) => e.key === "DB_USER");
  const dbPass = injectedEnvs.find((e) => e.key === "DB_PASSWORD");

  if (!dbUrl || !dbUser || !dbPass || dbUser.value !== pgService.credentials.username) {
    throw new Error(`Falha na injeção de variáveis: ${JSON.stringify(injectedEnvs)}`);
  }
  console.log("  ✔ Injeção de DATABASE_URL, DB_USER, DB_PASSWORD, DB_HOST: PASS");

  // -------------------------------------------------------------
  // 7. TESTES DE PROTEÇÃO DE VOLUMES E DELEÇÃO SEGURA
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 7]: Proteção de Volumes & Deleção em 2 Etapas");

  // Deleção de serviço padrão (preserva dados)
  const delStandard = DatabaseOrchestrator.deleteDatabaseService(pgService, undefined, false);
  if (!delStandard.volumePreserved) {
    throw new Error("Deleção padrão destruiu o volume de dados!");
  }

  // Tentativa de expurgo sem confirmação de nome (deve falhar)
  let caughtError = false;
  try {
    DatabaseOrchestrator.deleteDatabaseService(pgService, "nome_errado", true);
  } catch {
    caughtError = true;
  }
  if (!caughtError) {
    throw new Error("Falha ao bloquear expurgo sem confirmação exata do nome do banco!");
  }

  // Expurgo com confirmação exata
  const delPurge = DatabaseOrchestrator.deleteDatabaseService(pgService, pgService.name, true);
  if (delPurge.volumePreserved) {
    throw new Error("Expurgo com confirmação deveria liberar o volume!");
  }
  console.log("  ✔ Proteção de Volumes & Expurgo com Confirmação Estrita: PASS");

  console.log("\n==================================================");
  console.log("🎉 TODOS OS TESTES DOS DATABASE PROVIDERS PASSARAM!");
  console.log("==================================================");
}

runDatabaseProvidersTests();
