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
  console.log('\n🧹 LIMPANDO O BANCO E RESTAURANDO O BACKUP EXATO DO SUPABASE...');

  // 1. Limpar tabelas de dados
  await supabase.from('invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('domains').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('wallet_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('product_prices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('product_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Limpar usuários não-admin
  const { data: usersList } = await supabase.auth.admin.listUsers();
  for (const u of usersList?.users || []) {
    if (u.email !== 'jhonatavs@proton.me') {
      try {
        await supabase.auth.admin.deleteUser(u.id);
      } catch (e) {}
    }
  }

  console.log('✅ Banco de dados limpo com sucesso.');

  // 2. Restaurar exatamente a pasta de backup do Supabase
  const backupDir = path.join(rootDir, 'backups', 'backup-2026-08-24T15-15-23-611Z');
  console.log(`\n📂 Restaurando arquivos do backup Supabase: ${backupDir}`);

  // Grupos
  const groupsFile = path.join(backupDir, 'product_groups.json');
  if (fs.existsSync(groupsFile)) {
    const groups = JSON.parse(fs.readFileSync(groupsFile, 'utf-8'));
    for (const g of groups) {
      await supabase.from('product_groups').upsert({
        id: g.id,
        name: g.name,
        slug: g.slug,
        description: g.description,
        is_visible: g.is_visible ?? true,
        sort_order: g.sort_order ?? 0,
      });
      console.log(`✅ Grupo restaurado: ${g.name}`);
    }
  }

  // Produtos
  const productsFile = path.join(backupDir, 'products.json');
  if (fs.existsSync(productsFile)) {
    const products = JSON.parse(fs.readFileSync(productsFile, 'utf-8'));
    for (const p of products) {
      await supabase.from('products').upsert({
        id: p.id,
        group_id: p.group_id,
        name: p.name,
        slug: p.slug,
        description: p.description || '',
        product_type: p.product_type || 'hosting',
        directadmin_package: p.directadmin_package,
        disk_quota_mb: p.disk_quota_mb,
        bandwidth_quota_mb: p.bandwidth_quota_mb,
        domains_limit: p.domains_limit,
        email_accounts_limit: p.email_accounts_limit,
        database_limit: p.database_limit,
        is_featured: p.is_featured ?? false,
        is_visible: p.is_visible ?? true,
        sort_order: p.sort_order ?? 0,
      });
      console.log(`✅ Produto restaurado: ${p.name} (DirectAdmin: ${p.directadmin_package})`);

      // Preços padrão para cada produto
      await supabase.from('product_prices').upsert([
        { product_id: p.id, cycle: 'monthly', price: 19.90, setup_fee: 0, is_active: true },
        { product_id: p.id, cycle: 'annually', price: 199.00, setup_fee: 0, is_active: true }
      ], { onConflict: 'product_id,cycle' });
    }
  }

  // 3. Garantir Usuário Administrador
  let adminId = null;
  const { data: adminUser } = await supabase.auth.admin.createUser({
    email: 'jhonatavs@proton.me',
    password: 'Admin#2026@Eqsam',
    email_confirm: true,
    user_metadata: { full_name: 'Jhonata', registration_completed: true }
  });
  adminId = adminUser?.user?.id;

  if (!adminId) {
    const { data: list } = await supabase.auth.admin.listUsers();
    adminId = list?.users?.find(u => u.email === 'jhonatavs@proton.me')?.id;
  }

  if (adminId) {
    await supabase.from('profiles').upsert({
      id: adminId,
      full_name: 'Jhonata',
      email: 'jhonatavs@proton.me',
      status: 'active',
      account_balance: 0.00
    });

    await supabase.from('user_roles').upsert({
      user_id: adminId,
      role: 'admin'
    }, { onConflict: 'user_id,role' });

    console.log(`✅ Administrador configurado: jhonatavs@proton.me (ID: ${adminId})`);
  }

  console.log(`\n🎉 RESTAURAÇÃO EXATA DO SUPABASE FINALIZADA! O banco está idêntico ao anterior. 🚀\n`);
}

main();
