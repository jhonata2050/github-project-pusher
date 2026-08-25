import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const envText = fs.readFileSync('.env', 'utf8');
envText.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkAppOwner() {
  const { data } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'coolify_applications_store').maybeSingle();
  let store = data?.value;
  if (typeof store === 'string') store = JSON.parse(store);
  const app = store['c35260bc-8b7f-4d21-90fd-6021fd393fbd'];
  console.log('App user_id:', app?.user_id);
}

checkAppOwner();
