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

// Helper para parsear uma linha de tupla SQL: (1, 'valor', NULL, ...)
function parseSqlTuple(line, columns) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('(')) return null;

  // Remover '(' inicial e '),' ou ');' final
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

    if (escape) {
      currentVal += char;
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === "'" && !escape) {
      inString = !inString;
      continue;
    }

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
  columns.forEach((col, idx) => {
    obj[col] = values[idx] !== undefined ? values[idx] : null;
  });

  return obj;
}

async function main() {
  const sqlPath = 'C:\\Users\\jhona\\Downloads\\eqsam1237_whmcs-clients.sql';
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ Arquivo não encontrado:', sqlPath);
    process.exit(1);
  }

  console.log(`\n🚀 LENDO BASE DE DADOS COMPLETA DO WHMCS (627 MB)...`);
  const fileStream = fs.createReadStream(sqlPath, { encoding: 'latin1' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentTable = null;
  let currentColumns = [];

  const whmcsClients = [];
  const whmcsHosting = [];
  const whmcsDomains = [];
  const whmcsInvoices = [];
  const whmcsServers = [];

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

    if (currentTable && trimmed.startsWith('(')) {
      const parsed = parseSqlTuple(trimmed, currentColumns);
      if (parsed) {
        if (currentTable === 'tblclients') whmcsClients.push(parsed);
        else if (currentTable === 'tblhosting') whmcsHosting.push(parsed);
        else if (currentTable === 'tbldomains') whmcsDomains.push(parsed);
        else if (currentTable === 'tblinvoices') whmcsInvoices.push(parsed);
        else if (currentTable === 'tblservers') whmcsServers.push(parsed);
      }
      if (trimmed.endsWith(');')) {
        currentTable = null;
        currentColumns = [];
      }
    }
  }

  console.log(`\n📊 DADOS EXTRAÍDOS DO WHMCS:`);
  console.log(`- 👥 Clientes: ${whmcsClients.length}`);
  console.log(`- 📦 Hospedagens/VPS: ${whmcsHosting.length}`);
  console.log(`- 🌐 Domínios: ${whmcsDomains.length}`);
  console.log(`- 💳 Faturas: ${whmcsInvoices.length}`);
  console.log(`- 🖥️ Servidores: ${whmcsServers.length}\n`);

  // 1. IMPORTAR SERVIDORES
  const serverMap = {};
  for (const s of whmcsServers) {
    if (!s.hostname) continue;
    const { data: srv } = await supabase.from('servers').upsert({
      name: s.name || s.hostname,
      hostname: s.hostname,
      ip_address: s.ipaddress || '127.0.0.1',
      port: 2222,
      type: 'directadmin',
      api_user: s.username || 'admin',
      api_token: s.accesshash || 'token',
      is_active: true,
      max_accounts: Number(s.maxaccounts) || 200,
    }, { onConflict: 'hostname' }).select().maybeSingle();

    if (srv) serverMap[s.id] = srv.id;
  }
  console.log(`✅ Servidores sincronizados.`);

  // 2. IMPORTAR TODOS OS CLIENTES
  const clientUserMap = {};
  let importedClients = 0;

  for (const c of whmcsClients) {
    if (!c.email || !c.email.includes('@')) continue;
    const email = c.email.trim().toLowerCase();
    const fullName = `${c.firstname || ''} ${c.lastname || ''}`.trim() || c.companyname || 'Cliente';
    const balance = Number(c.credit) || 0.00;

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
      const existing = listData?.users?.find(u => u.email?.toLowerCase() === email);
      if (existing) userId = existing.id;
    }

    if (userId) {
      clientUserMap[c.id] = userId;

      await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName,
        email: email,
        company_name: c.companyname || '',
        phone: c.phonenumber || '',
        tax_id: c.tax_id || '',
        address_line: c.address1 || '',
        address_line2: c.address2 || '',
        city: c.city || '',
        state: c.state || '',
        postal_code: c.postcode || '',
        country: c.country || 'BR',
        status: c.status === 'Active' ? 'active' : (c.status === 'Inactive' ? 'inactive' : 'closed'),
        account_balance: balance,
        whmcs_id: String(c.id),
      });

      await supabase.from('user_roles').upsert({
        user_id: userId,
        role: 'client'
      }, { onConflict: 'user_id,role' });

      importedClients++;
      if (importedClients % 10 === 0 || importedClients <= 5) {
        console.log(`👤 [${importedClients}/${whmcsClients.length}] Cliente importado: ${fullName} (${email})`);
      }
    }
  }

  console.log(`\n🎉 TOTAL DE CLIENTES IMPORTADOS: ${importedClients}\n`);

  // Obter produto padrão
  const { data: allProducts } = await supabase.from('products').select('*');
  const defaultProduct = allProducts?.[0];

  // 3. IMPORTAR HOSPEDAGENS / SERVIÇOS
  let importedServices = 0;
  for (const h of whmcsHosting) {
    const targetUserId = clientUserMap[h.userid];
    if (!targetUserId) continue;

    let cycle = 'monthly';
    const rawCycle = (h.billingcycle || '').toLowerCase();
    if (rawCycle.includes('annual') || rawCycle.includes('ano')) cycle = 'annually';
    else if (rawCycle.includes('quarter')) cycle = 'quarterly';
    else if (rawCycle.includes('semi')) cycle = 'semiannually';
    else if (rawCycle.includes('bienn')) cycle = 'biennially';

    let sStatus = 'active';
    const rawStatus = (h.domainstatus || '').toLowerCase();
    if (rawStatus === 'suspended') sStatus = 'suspended';
    else if (rawStatus === 'terminated' || rawStatus === 'cancelled') sStatus = 'cancelled';
    else if (rawStatus === 'pending') sStatus = 'pending';

    const { error: sErr } = await supabase.from('services').insert({
      user_id: targetUserId,
      product_id: defaultProduct?.id,
      server_id: serverMap[h.server] || Object.values(serverMap)[0] || null,
      domain: h.domain || 'sem-dominio.com',
      username: h.username || 'user',
      password: h.password || '',
      billing_cycle: cycle,
      status: sStatus,
      next_due_date: h.nextduedate || new Date().toISOString(),
      whmcs_id: String(h.id),
      notes: h.notes || '',
    });

    if (!sErr) importedServices++;
  }
  console.log(`✅ TOTAL DE SERVIÇOS IMPORTADOS: ${importedServices}\n`);

  // 4. IMPORTAR DOMÍNIOS
  let importedDomains = 0;
  for (const d of whmcsDomains) {
    const targetUserId = clientUserMap[d.userid];
    if (!targetUserId || !d.domain) continue;

    let dStatus = 'active';
    const rawStatus = (d.status || '').toLowerCase();
    if (rawStatus === 'expired') dStatus = 'expired';
    else if (rawStatus === 'pending') dStatus = 'pending';
    else if (rawStatus === 'cancelled') dStatus = 'cancelled';

    const { error: dErr } = await supabase.from('domains').upsert({
      user_id: targetUserId,
      domain_name: d.domain.toLowerCase(),
      registrar: d.registrar || 'openprovider',
      status: dStatus,
      registration_date: d.registrationdate || new Date().toISOString(),
      expiry_date: d.expirydate || null,
      auto_renew: true,
      is_locked: true,
    }, { onConflict: 'domain_name' });

    if (!dErr) importedDomains++;
  }
  console.log(`✅ TOTAL DE DOMÍNIOS IMPORTADOS: ${importedDomains}\n`);

  console.log(`🚀 RESTAURAÇÃO TOTAL CONCLUÍDA COM SUCESSO!\n`);
}

main();
