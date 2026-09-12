process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Crypto random generator logic for migration
import crypto from 'crypto';

function generateRandomHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateRandomBase64(bytes) {
  return crypto.randomBytes(bytes).toString('base64');
}

function generateSecureRandomSecret(key = '') {
  const upper = key.toUpperCase().trim();
  if (upper === 'APP_KEY') {
    return `base64:${generateRandomBase64(32)}`;
  }
  if (upper === 'AUTHENTICATION_API_KEY') {
    return `evo_${generateRandomHex(24)}`;
  }
  if (
    upper.includes('AUTH_SECRET') ||
    upper.includes('NEXTAUTH_SECRET') ||
    upper.includes('JWT') ||
    upper.includes('ENCRYPTION') ||
    upper.includes('SALT') ||
    upper.includes('AUTH_KEY') ||
    upper.includes('NONCE_KEY') ||
    upper.includes('LOGGED_IN_KEY')
  ) {
    return generateRandomHex(32); // 64 hex chars
  }
  if (upper.includes('CRON_SECRET')) {
    return generateRandomHex(24); // 48 hex chars
  }
  if (upper.includes('PASSWORD') || upper.includes('PASSWD') || upper.includes('PASS')) {
    return generateRandomHex(16); // 32 hex chars
  }
  return generateRandomHex(16);
}

function isSecretKey(key) {
  if (!key) return false;
  const upper = key.toUpperCase().trim();
  if (
    upper.includes('PASSWORD') ||
    upper.includes('PASSWD') ||
    upper.includes('ROOT_PASS') ||
    upper.endsWith('_PASS') ||
    upper === 'PASS'
  ) {
    return true;
  }
  if (
    upper.includes('SECRET') ||
    upper.includes('AUTH_SECRET') ||
    upper.includes('NEXTAUTH_SECRET') ||
    upper.includes('JWT') ||
    upper.includes('CRON_SECRET') ||
    upper.includes('ENCRYPTION') ||
    upper.includes('SALT') ||
    upper.includes('AUTH_KEY') ||
    upper.includes('NONCE_KEY') ||
    upper.includes('LOGGED_IN_KEY')
  ) {
    return true;
  }
  if (upper === 'APP_KEY' || upper === 'AUTHENTICATION_API_KEY') {
    return true;
  }
  return false;
}

function isThirdPartyApiKey(key) {
  if (!key) return false;
  const upper = key.toUpperCase().trim();
  const thirdPartyPrefixesOrNames = [
    'RESEND_',
    'DISCORD_',
    'CLIENT_ID',
    'CLIENT_SECRET',
    'TELEGRAM_',
    'OPENAI_',
    'ANTHROPIC_',
    'GEMINI_',
    'STRIPE_',
    'TINY_BIRD_',
    'UNKEY_',
    'VERCEL_',
    'PROJECT_ID_VERCEL',
    'TEAM_ID_VERCEL',
    'AWS_',
    'GITHUB_',
    'GITLAB_',
  ];
  return thirdPartyPrefixesOrNames.some((token) => upper.includes(token));
}

function isInsecureOrPlaceholderValue(key, value) {
  if (!value || typeof value !== 'string') return true;
  const val = value.trim();
  if (val === '') return true;
  const lower = val.toLowerCase();
  const insecurePatterns = [
    'eqsam_wp_pass',
    'eqsam-auth-secret',
    'eqsam-cron',
    'eqsam_api_secret_key',
    'eqsam_laravel_placeholder',
    'eqsam_postgres_pass',
    'eqsam_mysql_pass',
    'eqsam_root_pass',
    'eqsam_wp_',
    'eqsam_n8n_',
    'eqsam_evo_',
    'eqsam_tb_',
    'eqsam_pg_',
    'eqsam_mysql_',
    'eqsam_root_',
    'eqsam_redis_',
    'eqsam_tb_secret_',
    'eqsam_auth_key_',
    'eqsam_sec_auth_key_',
    'eqsam_logged_in_key_',
    'eqsam_nonce_key_',
    'eqsam_auth_salt_',
    'eqsam_sec_salt_',
    'eqsam_logged_salt_',
    'eqsam_nonce_salt_',
    'changeme',
    'change_me',
    'password123',
    'secret123',
    'admin123',
  ];
  for (const p of insecurePatterns) {
    if (lower.includes(p)) return true;
  }
  if (['password', 'secret', 'root', 'admin', '123456', '12345678', 'test'].includes(lower)) {
    return true;
  }
  if (key.toUpperCase() === 'APP_KEY' && (lower.includes('placeholder') || !val.startsWith('base64:'))) {
    return true;
  }
  return false;
}

function migrateEnvsArray(envs) {
  let modifiedCount = 0;
  const migrated = envs.map((e) => {
    if (!e || !e.key) return e;
    const k = e.key.trim();
    if (isSecretKey(k) && !isThirdPartyApiKey(k)) {
      if (isInsecureOrPlaceholderValue(k, e.value)) {
        const newSecret = generateSecureRandomSecret(k);
        console.log(`    [Migrado] ${k}: "${e.value}" -> "${newSecret.slice(0, 8)}... (${newSecret.length} chars)"`);
        modifiedCount++;
        return { ...e, key: k, value: newSecret };
      }
    }
    return e;
  });
  return { migrated, modifiedCount };
}

async function run() {
  console.log("=== INICIANDO MIGRAÇÃO CRIPTOGRÁFICA DE SENHAS E SEGREDOS ===");

  // 1. Migrar stores de aplicações
  const { data: storeRows, error: storeErr } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['cloud_applications_store', 'swarm_applications_store']);

  if (storeErr) {
    console.error("Erro ao buscar stores:", storeErr);
    return;
  }

  for (const row of (storeRows || [])) {
    console.log(`\nVerificando store: ${row.key}`);
    const store = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    let storeChanged = false;

    for (const [id, app] of Object.entries(store || {})) {
      if (app && Array.isArray(app.env_vars) && app.env_vars.length > 0) {
        console.log(`  Verificando App [${id}] "${app.name}":`);
        const { migrated, modifiedCount } = migrateEnvsArray(app.env_vars);
        if (modifiedCount > 0) {
          app.env_vars = migrated;
          app.updated_at = new Date().toISOString();
          storeChanged = true;
          console.log(`  -> ${modifiedCount} variáveis inseguras migradas para hashes criptográficos.`);
        }
      }
    }

    if (storeChanged) {
      const { error: updErr } = await supabase
        .from('system_settings')
        .upsert({
          key: row.key,
          value: store,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (updErr) {
        console.error(`Erro ao salvar store ${row.key}:`, updErr);
      } else {
        console.log(`✅ Store ${row.key} atualizado com sucesso no Supabase!`);
      }
    } else {
      console.log(`Nenhuma alteração necessária em ${row.key}.`);
    }
  }

  // 2. Migrar registros individuais de app_envs_<appId>
  const { data: envSettings, error: envErr } = await supabase
    .from('system_settings')
    .select('key, value')
    .like('key', 'app_envs_%');

  if (envErr) {
    console.error("Erro ao buscar app_envs_:", envErr);
    return;
  }

  console.log(`\nVerificando ${envSettings?.length || 0} registros individuais de variáveis:`);
  for (const row of (envSettings || [])) {
    const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    if (Array.isArray(parsed)) {
      console.log(`  Registro ${row.key}:`);
      const { migrated, modifiedCount } = migrateEnvsArray(parsed);
      if (modifiedCount > 0) {
        const { error: saveErr } = await supabase
          .from('system_settings')
          .upsert({
            key: row.key,
            value: migrated,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });

        if (saveErr) {
          console.error(`Erro ao atualizar ${row.key}:`, saveErr);
        } else {
          console.log(`  ✅ Registro ${row.key} migrado com ${modifiedCount} hashes gerados!`);
        }
      }
    }
  }

  console.log("\n=== MIGRAÇÃO CONCLUÍDA COM SUCESSO! ===");
}

run();
