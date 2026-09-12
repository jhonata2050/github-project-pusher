process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testServicesQuery() {
  console.log("=== TESTANDO A QUERY DE SERVIÇOS DO FRONTEND ===");

  // Pegar primeiro usuário que possui serviços
  const { data: svcSample } = await supabaseAdmin.from("services").select("user_id").limit(1).single();
  const userId = svcSample?.user_id;
  console.log("User ID para teste:", userId);

  // Executar a query exata de src/routes/_authenticated/services.index.tsx
  console.log("\nExecutando query exata de services.index.tsx...");
  const { data, error } = await supabaseAdmin
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
      created_at,
      updated_at,
      products (
        name,
        product_type,
        directadmin_package
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ ERRO NA QUERY:", error);
  } else {
    console.log("✅ QUERY EXECUTADA COM SUCESSO! Total retornado:", data?.length);
    console.log("Primeiro registro:", data?.[0]);
  }
}

testServicesQuery().catch(console.error);
