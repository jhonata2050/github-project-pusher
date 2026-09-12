process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Client } from "ssh2";
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
          if (!process.env[key]) {
            process.env[key] = val;
          }
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

async function measure() {
  console.log("=== MEDIÇÃO INICIAL DE BASELINE (ANTES DAS MODIFICAÇÕES) ===");

  // 1. SSH Handshake
  console.log("\n1. Medindo SSH Handshake para o Cluster Swarm Manager...");
  const t0 = Date.now();
  const conn = new Client();
  try {
    await new Promise((resolve, reject) => {
      conn.on("ready", resolve).on("error", reject).connect({
        host: "45.159.172.137",
        port: 30795,
        username: "root",
        password: process.env.SWARM_SSH_PASSWORD || "uvU8Ly3S6IaXW1fE",
        readyTimeout: 15000,
      });
    });
    const handshakeTimeMs = Date.now() - t0;
    console.log(`- SSH Handshake: ${handshakeTimeMs}ms`);

    // 2. Comandos Docker
    const tCmd1 = Date.now();
    await new Promise((resolve) => {
      conn.exec('docker service ls --format "{{.Name}}"', (err, stream) => {
        let out = "";
        stream.on("data", (d) => (out += d)).on("close", () => {
          console.log(`- docker service ls executado em: ${Date.now() - tCmd1}ms (${out.trim().split("\n").length} serviços)`);
          resolve();
        });
      });
    });

    const tCmd2 = Date.now();
    await new Promise((resolve) => {
      conn.exec('docker stats --no-stream --format "{{json .}}"', (err, stream) => {
        let out = "";
        stream.on("data", (d) => (out += d)).on("close", () => {
          console.log(`- docker stats executado em: ${Date.now() - tCmd2}ms (${out.trim().split("\n").length} containers)`);
          resolve();
        });
      });
    });

    conn.end();
  } catch (err) {
    console.error("Erro no SSH:", err.message);
  }

  // 3. Auditoria de Payload / Vazamentos de Credenciais
  console.log("\n2. Inspecionando Payloads Atuais para detectar vazamento de secrets...");
  const { data: appsStore } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "cloud_applications_store")
    .maybeSingle();

  if (appsStore?.value) {
    const store = typeof appsStore.value === "string" ? JSON.parse(appsStore.value) : appsStore.value;
    const sampleApp = Object.values(store)[0];
    if (sampleApp) {
      console.log(`- Amostra da store ApplicationRecord:`);
      console.log(`  id: ${sampleApp.id}`);
      console.log(`  name: ${sampleApp.name}`);
      console.log(`  possui env_vars na store? ${Boolean(sampleApp.env_vars && sampleApp.env_vars.length > 0)} (total: ${sampleApp.env_vars?.length || 0})`);
      if (sampleApp.env_vars?.length > 0) {
        console.log(`  [ALERTA DE SEGURANÇA] env_vars exposto no ApplicationRecord:`);
        sampleApp.env_vars.slice(0, 3).forEach((ev) => {
          console.log(`    ${ev.key} = ${ev.value ? ev.value.slice(0, 5) + "..." : "(empty)"}`);
        });
      }
    }
  }

  // 4. Inspecionando query de services
  const { data: sampleService } = await supabaseAdmin
    .from("services")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (sampleService) {
    console.log(`\n3. Amostra da query SELECT * FROM services:`);
    console.log(`  id: ${sampleService.id}`);
    console.log(`  user_id: ${sampleService.user_id}`);
    console.log(`  password presente no SELECT *? ${Boolean(sampleService.password)} (tamanho: ${sampleService.password?.length || 0})`);
    if (sampleService.password) {
      console.log(`  [ALERTA DE SEGURANÇA] 'password' retornado na consulta SELECT *!`);
    }
  }

  console.log("\n=== FIM DO BASELINE ===");
}

measure().catch(console.error);
