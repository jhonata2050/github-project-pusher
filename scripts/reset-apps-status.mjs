import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function resetApps() {
  const { data, error } = await supabase.from('system_settings').select('*').eq('key', 'coolify_applications_store').maybeSingle();
  if (error) {
    console.error('Error fetching settings:', error);
    return;
  }
  if (data?.value) {
    const store = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    for (const id in store) {
      store[id].status = 'pending_deploy';
      store[id].git_repository = '';
      store[id].git_branch = 'main';
    }
    await supabase.from('system_settings').upsert({
      key: 'coolify_applications_store',
      value: store,
      updated_at: new Date().toISOString()
    });
    console.log('Successfully updated', Object.keys(store).length, 'apps to pending_deploy');
  }
}

resetApps();
