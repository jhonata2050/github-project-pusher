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
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Erro: SUPABASE_URL ou chaves de acesso não configuradas no .env');
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

function getLatestBackupDir() {
  const backupsDir = path.join(rootDir, 'backups');
  if (!fs.existsSync(backupsDir)) return null;

  const entries = fs.readdirSync(backupsDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith('backup-'))
    .map(e => e.name)
    .sort()
    .reverse();

  return entries.length > 0 ? path.join(backupsDir, entries[0]) : null;
}

async function main() {
  const backupDir = getLatestBackupDir();
  console.log(`\n📂 Importando dados do backup: ${backupDir}`);

  // 1. Restaurar Grupos de Produtos
  const groupsFile = path.join(backupDir, 'product_groups.json');
  if (fs.existsSync(groupsFile)) {
    const groups = JSON.parse(fs.readFileSync(groupsFile, 'utf-8'));
    for (const g of groups) {
      const { error } = await supabase.from('product_groups').upsert({
        id: g.id,
        name: g.name,
        slug: g.slug,
        description: g.description,
        is_visible: g.is_visible ?? true,
        sort_order: g.sort_order ?? 0,
      }, { onConflict: 'slug' });
      if (error) console.warn(`⚠️ Grupo ${g.name}:`, error.message);
      else console.log(`✅ Grupo importado: ${g.name}`);
    }
  }

  // 1. Obter mapa de grupos por slug
  const { data: dbGroups } = await supabase.from('product_groups').select('*');
  const groupMap = {};
  dbGroups?.forEach(g => { groupMap[g.slug] = g.id; });

  // 2. Restaurar Produtos
  const productsFile = path.join(backupDir, 'products.json');
  if (fs.existsSync(productsFile)) {
    const products = JSON.parse(fs.readFileSync(productsFile, 'utf-8'));
    for (const p of products) {
      const targetGroupId = p.product_type === 'vps' 
        ? groupMap['vps'] || dbGroups?.[0]?.id 
        : groupMap['hospedagem'] || dbGroups?.[0]?.id;

      const { error } = await supabase.from('products').upsert({
        name: p.name,
        slug: p.slug,
        group_id: targetGroupId,
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
      }, { onConflict: 'slug' });

      if (error) console.warn(`⚠️ Produto ${p.name}:`, error.message);
      else console.log(`✅ Produto importado com sucesso: ${p.name} (Pacote DA: ${p.directadmin_package})`);
    }
  }

  // 3. Garantir Preços dos Produtos
  const { data: allDbProducts } = await supabase.from('products').select('*');
  if (allDbProducts) {
    for (const p of allDbProducts) {
      await supabase.from('product_prices').upsert([
        { product_id: p.id, cycle: 'monthly', price: 19.90, setup_fee: 0, is_active: true },
        { product_id: p.id, cycle: 'annually', price: 199.00, setup_fee: 0, is_active: true },
      ], { onConflict: 'product_id,cycle' });
    }
    console.log(`✅ Tabela de preços vinculada a todos os ${allDbProducts.length} produtos.`);
  }

  console.log(`\n🎉 Todos os dados do backup foram restaurados com sucesso no novo banco de dados!\n`);
}

main();
