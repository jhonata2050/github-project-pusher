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

function parseSqlTuple(line, columns) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('(')) return null;

  let content = trimmed;
  if (content.startsWith('(')) content = content.slice(1);
  if (content.endsWith(');')) content = content.slice(0, -2);
  else if (content.endsWith('),')) content = content.slice(0, -2);
  else if (content.endsWith(')')) content = content.slice(0, -1);

  const values = [];
  let inString = false;
  let escape = false;
  let currentVal = '';

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (escape) { currentVal += char; escape = false; continue; }
    if (char === '\\') { escape = true; continue; }
    if (char === "'" && !escape) { inString = !inString; continue; }
    if (!inString && char === ',') {
      let finalVal = currentVal.trim();
      if (finalVal.toUpperCase() === 'NULL') finalVal = null;
      values.push(finalVal);
      currentVal = '';
      continue;
    }
    currentVal += char;
  }
  let finalVal = currentVal.trim();
  if (finalVal.toUpperCase() === 'NULL') finalVal = null;
  values.push(finalVal);

  const obj = {};
  columns.forEach((col, idx) => { obj[col] = values[idx] !== undefined ? values[idx] : null; });
  return obj;
}

async function main() {
  const sqlPath = 'C:\\Users\\jhona\\Downloads\\eqsam1237_whmcs-clients.sql';
  console.log(`\n🚀 Lendo todos os 770 usuários de tblusers do WHMCS...`);

  const fileStream = fs.createReadStream(sqlPath, { encoding: 'latin1' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentTable = null;
  let currentColumns = [];
  const allUsers = [];

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.startsWith('INSERT INTO `')) {
      const match = trimmed.match(/^INSERT INTO `(\w+)`\s*\(([^)]+)\)\s*VALUES/);
      if (match) {
        currentTable = match[1];
        currentColumns = match[2].split(',').map(c => c.trim().replace(/`/g, ''));
        continue;
      }
    }
    if (currentTable === 'tblusers' && trimmed.startsWith('(')) {
      const u = parseSqlTuple(trimmed, currentColumns);
      if (u) allUsers.push(u);
      if (trimmed.endsWith(');')) currentTable = null;
    }
  }

  console.log(`📊 Usuários encontrados em tblusers: ${allUsers.length}`);

  let imported = 0;
  for (const u of allUsers) {
    if (!u.email || !u.email.includes('@')) continue;
    const email = u.email.trim().toLowerCase();
    let fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Cliente';
    try {
      fullName = Buffer.from(fullName, 'binary').toString('utf-8');
    } catch (e) {}

    let userId = null;
    try {
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: email,
        password: 'Cliente#2026@Eqsam',
        email_confirm: true,
        user_metadata: { full_name: fullName, registration_completed: true }
      });
      if (authUser?.user?.id) userId = authUser.user.id;
    } catch (e) {}

    if (!userId) {
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existing = listData?.users?.find(usr => usr.email?.toLowerCase() === email);
      if (existing) userId = existing.id;
    }

    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName,
        email: email,
        status: 'active',
        whmcs_id: String(u.id),
      });

      await supabase.from('user_roles').upsert({
        user_id: userId,
        role: 'client'
      }, { onConflict: 'user_id,role' });

      imported++;
      if (imported % 50 === 0 || fullName.toLowerCase().includes('andrew')) {
        console.log(`👤 Importado: ${fullName} (${email})`);
      }
    }
  }

  console.log(`\n🎉 SUCESSO! Total de usuários importados do WHMCS: ${imported}\n`);
}

main();
