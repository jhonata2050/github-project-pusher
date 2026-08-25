process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to load .env manually
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
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_KEY = SUPABASE_SERVICE_KEY || SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Erro: SUPABASE_URL ou chave de acesso não configuradas no .env');
  process.exit(1);
}

function isNewSupabaseApiKey(value) {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey) {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: {
    fetch: createSupabaseFetch(SUPABASE_KEY),
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

const TABLES = [
  'profiles',
  'user_roles',
  'servers',
  'product_groups',
  'products',
  'product_prices',
  'services',
  'vps_instances',
  'orders',
  'invoices',
  'invoice_items',
  'transactions',
  'wallet_transactions',
  'coupons',
  'domains',
  'tickets',
  'ticket_messages',
  'system_settings',
  'audit_logs',
  'email_logs',
  'whmcs_imports'
];

export async function runBackup() {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(rootDir, 'backups', `backup-${dateStr}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`\n📦 [${now.toLocaleString('pt-BR')}] Iniciando backup do banco Supabase...`);
  console.log(`📂 Destino: ${backupDir}\n`);

  const summary = {
    timestamp: now.toISOString(),
    usingServiceRole: Boolean(SUPABASE_SERVICE_KEY),
    tables: {}
  };

  let totalRecords = 0;

  for (const table of TABLES) {
    try {
      // Buscar todos os registros paginados caso a tabela tenha muitos registros
      let allRows = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(from, from + step - 1);

        if (error) {
          console.warn(`⚠️ [${table}] Alerta: ${error.message}`);
          summary.tables[table] = { status: 'warning', error: error.message };
          hasMore = false;
        } else {
          if (data && data.length > 0) {
            allRows.push(...data);
            if (data.length < step) hasMore = false;
            else from += step;
          } else {
            hasMore = false;
          }
        }
      }

      const count = allRows.length;
      totalRecords += count;
      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(allRows, null, 2), 'utf-8');
      console.log(`✅ [${table}] ${count} registros salvos.`);
      summary.tables[table] = { status: 'success', count };
    } catch (err) {
      console.error(`❌ [${table}] Erro:`, err.message);
      summary.tables[table] = { status: 'error', error: err.message };
    }
  }

  summary.totalRecords = totalRecords;
  fs.writeFileSync(
    path.join(backupDir, '_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );

  console.log(`\n🎉 Backup concluído com sucesso em: ${backupDir} (${totalRecords} registros exportados)\n`);
  return backupDir;
}

// Se executado diretamente via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Falha fatal no backup:', err);
      process.exit(1);
    });
}
