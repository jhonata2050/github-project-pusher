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
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Erro: Chaves de acesso ao Supabase não configuradas no .env');
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
  global: { fetch: createSupabaseFetch(SUPABASE_KEY) },
  auth: { persistSession: false, autoRefreshToken: false }
});

// Helper para parsear blocos COPY do PostgreSQL dump
function parseCopyBlocks(sqlContent) {
  const tables = {};
  const lines = sqlContent.split('\n');
  let currentTable = null;
  let currentColumns = [];
  let rows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('COPY public.')) {
      const match = line.match(/^COPY public\.(\w+)\s*\(([^)]+)\)\s*FROM stdin;/);
      if (match) {
        currentTable = match[1];
        currentColumns = match[2].split(',').map(c => c.trim());
        rows = [];
      }
    } else if (line.trim() === '\\.' && currentTable) {
      tables[currentTable] = { columns: currentColumns, rows };
      currentTable = null;
      currentColumns = [];
      rows = [];
    } else if (currentTable) {
      if (line.trim().length > 0) {
        const parts = line.split('\t');
        const rowObj = {};
        currentColumns.forEach((col, idx) => {
          let val = parts[idx];
          if (val === '\\N' || val === undefined) {
            val = null;
          }
          rowObj[col] = val;
        });
        rows.push(rowObj);
      }
    }
  }

  return tables;
}

async function main() {
  const sqlPath = 'C:\\Users\\jhona\\Downloads\\backup_filtered.sql';
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ Arquivo não encontrado:', sqlPath);
    process.exit(1);
  }

  console.log(`\n🚀 Lendo backup de produção: ${sqlPath}...`);
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
  const copyData = parseCopyBlocks(sqlContent);

  console.log(`📊 Tabelas detectadas no dump:`, Object.keys(copyData));

  // 1. Restaurar Servidores
  const serverMap = {}; // old_id -> new_id
  if (copyData.hosting_servers) {
    console.log(`\n🖥️ Restaurando ${copyData.hosting_servers.rows.length} servidor(es)...`);
    for (const s of copyData.hosting_servers.rows) {
      const { data: server, error } = await supabase.from('servers').upsert({
        id: s.id,
        name: s.name || 'Servidor BR01',
        hostname: s.hostname,
        ip_address: s.shared_ip || '177.136.251.226',
        port: Number(s.port) || 2222,
        type: 'directadmin',
        api_user: s.username || 'eqsa7232',
        api_token: s.api_token_encrypted || 'token',
        is_active: s.status === 'active' || s.status === 't',
        max_accounts: Number(s.max_accounts) || 200,
      }).select().single();

      if (server) {
        serverMap[s.id] = server.id;
        console.log(`✅ Servidor restaurado: ${s.name} (${s.hostname})`);
      } else if (error) {
        console.warn(`⚠️ Alerta servidor:`, error.message);
        serverMap[s.id] = s.id;
      }
    }
  }

  // 2. Restaurar Clientes / Usuários em auth.users e public.profiles
  const customerUserMap = {}; // customer_id -> auth_user_id
  if (copyData.hosting_customers) {
    console.log(`\n👥 Restaurando ${copyData.hosting_customers.rows.length} cliente(s)...`);
    for (const c of copyData.hosting_customers.rows) {
      if (!c.email) continue;
      const email = c.email.trim().toLowerCase();
      let userId = null;

      // 1. Tentar criar no Supabase Auth
      try {
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email: email,
          password: 'Cliente#2026@Eqsam',
          email_confirm: true,
          user_metadata: {
            full_name: c.full_name,
            registration_completed: true,
          }
        });

        if (authUser?.user?.id) {
          userId = authUser.user.id;
        } else {
          // Listar todos os usuários paginados
          let page = 1;
          while (!userId && page <= 10) {
            const { data: listData } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
            if (!listData?.users || listData.users.length === 0) break;
            const found = listData.users.find(u => u.email?.toLowerCase() === email);
            if (found) userId = found.id;
            page++;
          }
        }
      } catch (e) {
        console.warn(`Aviso ao criar auth user ${email}:`, e.message);
      }

      if (userId) {
        customerUserMap[c.id] = userId;

        // Salvar Perfil
        const { error: pErr } = await supabase.from('profiles').upsert({
          id: userId,
          full_name: c.full_name,
          email: email,
          phone: c.phone || '',
          tax_id: c.document_number || '',
          company_name: c.company_name || '',
          status: c.status || 'active',
          account_balance: 0.00,
        });

        // Garantir Role de Client
        await supabase.from('user_roles').upsert({
          user_id: userId,
          role: 'client'
        }, { onConflict: 'user_id,role' });

        console.log(`✅ Cliente restaurado: ${c.full_name} (${email}) -> ID: ${userId}`);
      }
    }
  }

  // 3. Obter produtos para vinculação
  const { data: products } = await supabase.from('products').select('*');
  const productByPkg = {};
  products?.forEach(p => {
    if (p.directadmin_package) productByPkg[p.directadmin_package.toUpperCase()] = p.id;
  });
  const defaultProductId = products?.[0]?.id;

  // 4. Restaurar Serviços
  const serviceMap = {};
  if (copyData.hosting_services) {
    console.log(`\n📦 Restaurando ${copyData.hosting_services.rows.length} serviço(s) ativo(s)...`);
    for (const s of copyData.hosting_services.rows) {
      const targetUserId = customerUserMap[s.customer_id];
      if (!targetUserId) continue;

      let pkgName = '';
      try {
        const meta = typeof s.whm_metadata === 'string' ? JSON.parse(s.whm_metadata) : s.whm_metadata;
        pkgName = meta?.raw?.directadmin_package || meta?.raw?.name || '';
      } catch (e) {}

      const matchedProductId = productByPkg[pkgName.toUpperCase()] || defaultProductId;

      const { data: srv, error } = await supabase.from('services').upsert({
        id: s.id,
        user_id: targetUserId,
        product_id: matchedProductId,
        server_id: serverMap[s.server_id] || Object.values(serverMap)[0] || null,
        domain: s.domain,
        username: s.username,
        status: s.status === 'active' ? 'active' : (s.status === 'suspended' ? 'suspended' : 'cancelled'),
        billing_cycle: (s.cycle?.toLowerCase() === 'annually' || s.cycle?.toLowerCase() === 'annual') ? 'annually' : 'monthly',
        next_due_date: s.next_due_at || new Date().toISOString(),
        notes: s.notes || '',
      }).select().single();

      if (srv) {
        serviceMap[s.id] = srv.id;
        console.log(`✅ Serviço restaurado: ${s.domain} (${s.username}) para cliente ${targetUserId}`);
      } else if (error) {
        console.warn(`⚠️ Alerta ao restaurar serviço ${s.domain}:`, error.message);
      }
    }
  }

  // 5. Restaurar Faturas
  const invoiceMap = {};
  if (copyData.hosting_invoices) {
    console.log(`\n💳 Restaurando ${copyData.hosting_invoices.rows.length} fatura(s)...`);
    for (const inv of copyData.hosting_invoices.rows) {
      const targetUserId = customerUserMap[inv.customer_id];
      if (!targetUserId) continue;

      const totalAmount = (Number(inv.total_cents) / 100) || (Number(inv.subtotal_cents) / 100) || 0;
      const invStatus = inv.status === 'paid' ? 'paid' : (inv.status === 'cancelled' ? 'cancelled' : 'pending');

      const { data: dbInv, error } = await supabase.from('invoices').upsert({
        id: inv.id,
        user_id: targetUserId,
        total_amount: totalAmount,
        subtotal: totalAmount,
        discount_amount: 0,
        status: invStatus,
        due_date: inv.due_at || new Date().toISOString(),
        paid_at: inv.paid_at || null,
        payment_method: inv.payment_method || 'pix',
        notes: `Fatura #${inv.number || inv.id.slice(0,8)}`,
      }).select().single();

      if (dbInv) {
        invoiceMap[inv.id] = dbInv.id;
      }
    }
    console.log(`✅ ${Object.keys(invoiceMap).length} faturas restauradas com sucesso!`);
  }

  // 6. Restaurar Itens de Fatura
  if (copyData.hosting_invoice_items) {
    console.log(`\n📝 Restaurando ${copyData.hosting_invoice_items.rows.length} item(ns) de faturas...`);
    for (const item of copyData.hosting_invoice_items.rows) {
      if (!invoiceMap[item.invoice_id]) continue;
      const amount = (Number(item.total_cents) / 100) || (Number(item.unit_cents) / 100) || 0;
      await supabase.from('invoice_items').upsert({
        id: item.id,
        invoice_id: item.invoice_id,
        service_id: serviceMap[item.service_id] || null,
        description: item.description || 'Hospedagem de Sites',
        amount: amount,
        quantity: Number(item.quantity) || 1,
      });
    }
    console.log(`✅ Itens de faturas restaurados!`);
  }

  console.log(`\n🎉 RESTAURAÇÃO COMPLETA DE PRODUÇÃO FINALIZADA COM SUCESSO! 🚀\n`);
}

main();
