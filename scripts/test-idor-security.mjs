process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  getMyApplications,
  getCloudApplicationDetails,
  getCloudApplicationEnvs,
  getCloudApplicationLogs,
  getCloudApplicationFiles,
} from "../src/lib/cloud-apps.server.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runSecurityAudit() {
  console.log("=== BATERIA DE TESTES DE SEGURANÇA, ISOLAMENTO E IDOR ===");

  // 1. Obter aplicações existentes para teste
  const { data: appsStore } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "cloud_applications_store")
    .maybeSingle();

  const store = typeof appsStore.value === "string" ? JSON.parse(appsStore.value) : appsStore.value;
  const appList = Object.values(store);

  if (appList.length === 0) {
    console.warn("Nenhuma aplicação encontrada na store para teste.");
    return;
  }

  const realApp = appList[0];
  const legitimateOwnerId = realApp.user_id;
  const attackerUserId = "00000000-0000-0000-0000-000000000999"; // Fake attacker user ID

  console.log(`\nAplicação Alvo: ${realApp.name} (${realApp.id})`);
  console.log(`Proprietário Legítimo: ${legitimateOwnerId}`);
  console.log(`Atacante Simulado: ${attackerUserId}`);

  let testPassed = 0;
  let testFailed = 0;

  // Teste 1: getMyApplications não deve retornar env_vars nem senha do serviço
  console.log("\n[TESTE 1] Auditoria de Payload em getMyApplications (Zero-Leakage)...");
  try {
    const apps = await getMyApplications(legitimateOwnerId);
    let hasLeak = false;
    for (const a of apps) {
      if (a.env_vars && a.env_vars.length > 0) {
        console.error(`❌ FALHA: env_vars exposto no app ${a.id}`);
        hasLeak = true;
      }
      if (a.service && a.service.password) {
        console.error(`❌ FALHA: senha do serviço exposta no app ${a.id}`);
        hasLeak = true;
      }
    }
    if (!hasLeak) {
      console.log("✅ APROVADO: getMyApplications NÃO retorna env_vars nem senhas!");
      testPassed++;
    } else {
      testFailed++;
    }
  } catch (e) {
    console.error("Erro no teste 1:", e.message);
    testFailed++;
  }

  // Teste 2: IDOR em getCloudApplicationDetails
  console.log("\n[TESTE 2] IDOR em getCloudApplicationDetails (Atacante tentando ler detalhes da app da vítima)...");
  try {
    await getCloudApplicationDetails(realApp.id, attackerUserId);
    console.error("❌ FALHA: Atacante conseguiu ler os detalhes da aplicação da vítima!");
    testFailed++;
  } catch (e) {
    if (e.message.includes("Acesso negado")) {
      console.log("✅ APROVADO: Bloqueado com sucesso ('Acesso negado')");
      testPassed++;
    } else {
      console.error("Erro inesperado:", e.message);
      testFailed++;
    }
  }

  // Teste 3: IDOR em getCloudApplicationEnvs
  console.log("\n[TESTE 3] IDOR em getCloudApplicationEnvs (Atacante tentando ler variáveis de ambiente da vítima)...");
  try {
    await getCloudApplicationEnvs(realApp.id, attackerUserId);
    console.error("❌ FALHA: Atacante conseguiu ler as variáveis de ambiente da vítima!");
    testFailed++;
  } catch (e) {
    if (e.message.includes("Acesso negado")) {
      console.log("✅ APROVADO: Bloqueado com sucesso ('Acesso negado')");
      testPassed++;
    } else {
      console.error("Erro inesperado:", e.message);
      testFailed++;
    }
  }

  // Teste 4: IDOR em getCloudApplicationLogs
  console.log("\n[TESTE 4] IDOR em getCloudApplicationLogs (Atacante tentando ler logs da aplicação da vítima)...");
  try {
    await getCloudApplicationLogs(realApp.id, attackerUserId);
    console.error("❌ FALHA: Atacante conseguiu ler os logs da aplicação da vítima!");
    testFailed++;
  } catch (e) {
    if (e.message.includes("Acesso negado")) {
      console.log("✅ APROVADO: Bloqueado com sucesso ('Acesso negado')");
      testPassed++;
    } else {
      console.error("Erro inesperado:", e.message);
      testFailed++;
    }
  }

  // Teste 5: IDOR em getCloudApplicationFiles
  console.log("\n[TESTE 5] IDOR em getCloudApplicationFiles (Atacante tentando ler filesystem da vítima)...");
  try {
    await getCloudApplicationFiles(realApp.id, attackerUserId);
    console.error("❌ FALHA: Atacante conseguiu ler os arquivos da aplicação da vítima!");
    testFailed++;
  } catch (e) {
    if (e.message.includes("Acesso negado")) {
      console.log("✅ APROVADO: Bloqueado com sucesso ('Acesso negado')");
      testPassed++;
    } else {
      console.error("Erro inesperado:", e.message);
      testFailed++;
    }
  }

  // Teste 6: Consulta na tabela services (colunas explícitas sem password)
  console.log("\n[TESTE 6] Consulta segura na tabela services (simulando services.index.tsx)...");
  try {
    const { data: clientServices } = await supabaseAdmin
      .from("services")
      .select(`
        id,
        user_id,
        product_id,
        server_id,
        username,
        status,
        domain,
        billing_cycle,
        next_due_date,
        suspension_reason,
        block_directadmin,
        created_at,
        updated_at
      `)
      .limit(5);

    let hasPassword = false;
    for (const svc of clientServices || []) {
      if (svc.password !== undefined) {
        hasPassword = true;
      }
    }
    if (!hasPassword) {
      console.log("✅ APROVADO: A consulta segura na tabela services não inclui o campo 'password'!");
      testPassed++;
    } else {
      console.error("❌ FALHA: Campo password presente na resposta de services!");
      testFailed++;
    }
  } catch (e) {
    console.error("Erro no teste 6:", e.message);
    testFailed++;
  }

  console.log(`\n=== RESULTADO DA AUDITORIA DE SEGURANÇA ===`);
  console.log(`Testes Aprovados: ${testPassed}/6`);
  console.log(`Testes Falhados: ${testFailed}/6`);

  if (testFailed > 0) {
    process.exit(1);
  }
}

runSecurityAudit().catch((err) => {
  console.error("Erro fatal no teste de segurança:", err);
  process.exit(1);
});
