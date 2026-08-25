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

async function checkUsers() {
  const { data: profiles } = await supabase.from('profiles').select('id, email');
  console.log('Profiles:', profiles);
  const { data: appData } = await supabase.from('system_settings').select('value').eq('key', 'coolify_apps_store').maybeSingle();
  console.log('Apps store keys:', Object.keys(appData?.value || {}));
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  console.log('App info:', appData?.value?.[appId]);
}

checkUsers();
