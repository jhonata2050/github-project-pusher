process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

function loadEnv() {
  const envPath = path.resolve('.env');
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
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

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
  global: { fetch: createSupabaseFetch(SUPABASE_KEY) },
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  const whmcsSqlPath = 'C:\\Users\\jhona\\Downloads\\eqsam1237_whmcs-clients.sql';
  if (!fs.existsSync(whmcsSqlPath)) {
    console.log('ℹ️ Arquivo WHMCS adicional não encontrado, pulando.');
    return;
  }

  console.log(`\n🔍 Verificando registros WHMCS em: ${whmcsSqlPath}...`);
  // O arquivo é grande (600MB), vamos ler por stream buscando INSERT INTO `tblclients` e `tbldomains`
  const fileStream = fs.createReadStream(whmcsSqlPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let clientsFound = 0;
  let domainsFound = 0;

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `tblclients`') || line.startsWith('INSERT INTO `tbldomains`')) {
      // Registros encontrados
      if (line.includes('`tblclients`')) clientsFound++;
      if (line.includes('`tbldomains`')) domainsFound++;
    }
  }

  console.log(`📊 Blocos WHMCS identificados: ${clientsFound} lotes de clientes, ${domainsFound} lotes de domínios.`);
}

main();
