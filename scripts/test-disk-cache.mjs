process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getCloudApplicationDetails } from "../src/lib/cloud-apps.server.ts";

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

async function testDiskCache() {
  console.log("=== TESTANDO CACHE DE DISCO EM 100 REQUESTS SIMULTÂNEOS ===");

  const { data: appsStore } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "cloud_applications_store")
    .maybeSingle();

  const store = typeof appsStore.value === "string" ? JSON.parse(appsStore.value) : appsStore.value;
  const sampleApp = Object.values(store)[0];

  if (!sampleApp) {
    console.error("Nenhum app encontrado na store.");
    process.exit(1);
  }

  console.log(`Testando com App: ${sampleApp.name} (${sampleApp.id})`);

  // Limpar cache de disco para medir cold start
  const diskCache = globalThis.__eqsam_app_disk_cache;
  if (diskCache) {
    diskCache.clear();
  }

  console.log("\n1. Executando primeira requisição (Cold Start - preenche cache de disco)...");
  const t0 = Date.now();
  const firstRes = await getCloudApplicationDetails(sampleApp.id, sampleApp.user_id);
  const coldTime = Date.now() - t0;
  console.log(`- Primeira requisição concluída em: ${coldTime} ms (${(coldTime / 1000).toFixed(3)} s)`);
  console.log(`- Item em cache:`, diskCache?.get(sampleApp.id));

  console.log("\n2. Executando lote de 100 requisições simultâneas...");
  const t1 = Date.now();
  const promises = Array.from({ length: 100 }, () =>
    getCloudApplicationDetails(sampleApp.id, sampleApp.user_id)
  );

  const results = await Promise.all(promises);
  const batchTime = Date.now() - t1;
  const avgReqTime = (batchTime / 100).toFixed(1);

  console.log(`- 100 requisições simultâneas concluídas em: ${batchTime} ms (${(batchTime / 1000).toFixed(3)} s)`);
  console.log(`- Tempo médio por requisição: ${avgReqTime} ms`);

  // Verificar ausência de env_vars no retorno
  let envLeak = false;
  for (const r of results) {
    if (r.env_vars !== undefined) {
      envLeak = true;
    }
  }

  if (envLeak) {
    console.error("❌ FALHA: env_vars vazou no retorno de getCloudApplicationDetails!");
    process.exit(1);
  } else {
    console.log("✅ APROVADO: env_vars é estritamente undefined em todas as 100 respostas!");
  }

  console.log("\n=== TESTE DE CACHE DE DISCO CONCLUÍDO COM SUCESSO ===");
}

testDiskCache().catch((err) => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
