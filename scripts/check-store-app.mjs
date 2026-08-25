import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

async function checkServiceAndStore() {
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const { data: service } = await supabaseAdmin.from('services').select('*').eq('id', appId).maybeSingle();
  console.log('Service in DB:', service?.id, service?.domain, service?.notes);

  const { data: storeData } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'coolify_applications_store').maybeSingle();
  let store = storeData?.value;
  if (typeof store === 'string') store = JSON.parse(store);
  console.log('Keys in coolify_applications_store:', Object.keys(store || {}));
  console.log('App in store:', store?.[appId]);
}

checkServiceAndStore();
