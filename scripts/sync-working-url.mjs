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

async function sync() {
  const { data } = await supabase.from('system_settings').select('*').eq('key', 'coolify_applications_store').single();
  const store = data.value;
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  if (store[appId]) {
    store[appId].fqdn = 'https://botstarter512mb.dk1.eqsam.com';
    store[appId].status = 'running';
    store[appId].direct_url = 'http://45.159.172.18:3100';
    store[appId].direct_port = 3100;
    await supabase.from('system_settings').update({ value: store, updated_at: new Date().toISOString() }).eq('key', 'coolify_applications_store');
    console.log('App store synced with working live URL!');
  }
}

sync();
