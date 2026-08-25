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

// Parse CLI arguments
const args = process.argv.slice(2);
let email = '';
let password = '';
let name = 'Administrador';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) {
    email = args[i + 1];
    i++;
  } else if (args[i] === '--password' && args[i + 1]) {
    password = args[i + 1];
    i++;
  } else if (args[i] === '--name' && args[i + 1]) {
    name = args[i + 1];
    i++;
  }
}

if (!email || !password) {
  console.log(`
Uso: node scripts/create-admin.mjs --email <email> --password <senha> [--name <nome>]
Exemplo: node scripts/create-admin.mjs --email admin@meudominio.com --password SenhaForte#123 --name "Super Admin"
`);
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_KEY = SUPABASE_SERVICE_KEY || SUPABASE_PUBLISHABLE_KEY;

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

async function main() {
  console.log(`\n🚀 Criando / Atualizando usuário Administrador: ${email}...`);

  try {
    // 1. Tentar criar usuário diretamente via Auth Admin API (ou fallback para signUp)
    let userId = null;
    try {
      const { data: adminUserData, error: adminErr } = await supabase.auth.admin.createUser({
        email: email.trim(),
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          registration_completed: true,
        }
      });
      if (adminUserData?.user?.id) {
        userId = adminUserData.user.id;
      } else if (adminErr) {
        console.log(`ℹ️ Auth Admin: ${adminErr.message}. Tentando signIn...`);
      }
    } catch (e) {
      // fallback
    }

    if (!userId) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInData?.user?.id) {
        userId = signInData.user.id;
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: { full_name: name, registration_completed: true }
          }
        });
        if (signUpError) {
          console.error('❌ Erro ao criar usuário:', signUpError.message);
          process.exit(1);
        }
        userId = signUpData?.user?.id;
      }
    }

    console.log(`✅ Usuário autenticado/criado com ID: ${userId}`);

    // 2. Garantir perfil em public.profiles
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email: email.trim(),
      full_name: name,
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (profileError) {
      console.warn('⚠️ Alerta ao atualizar perfil:', profileError.message);
    } else {
      console.log('✅ Perfil salvo em public.profiles');
    }

    // 3. Garantir role de admin em user_roles
    const { error: roleError } = await supabase.from('user_roles').upsert({
      user_id: userId,
      role: 'admin',
    }, { onConflict: 'user_id,role' });

    if (roleError) {
      console.warn('⚠️ Alerta ao atribuir role admin:', roleError.message);
    } else {
      console.log('✅ Papel de Administrador (admin) atribuído com sucesso!');
    }

    console.log(`\n🎉 Administrador configurado com sucesso!`);
    console.log(`📧 E-mail: ${email}`);
    console.log(`🔑 Senha: (configurada)\n`);
  } catch (err) {
    console.error('❌ Erro geral ao criar administrador:', err);
    process.exit(1);
  }
}

main();
