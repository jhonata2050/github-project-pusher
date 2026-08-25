import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

async function inspect() {
  const { data: servers } = await supabase.from('system_settings').select('*').eq('key', 'coolify_servers_registry').maybeSingle();
  console.log('COOLIFY SERVERS IN DB:', JSON.stringify(servers, null, 2));

  const { data: apps } = await supabase.from('system_settings').select('*').eq('key', 'coolify_applications_store').maybeSingle();
  console.log('COOLIFY APPS STORE IN DB:', JSON.stringify(apps, null, 2));
}

inspect();
