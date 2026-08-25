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

async function inspectAppFiles() {
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const { data, error } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'app_files_' + appId).maybeSingle();
  console.log('Error:', error);
  let files = data?.value;
  if (typeof files === 'string') {
    try { files = JSON.parse(files); } catch(e) {}
  }
  console.log('Total files currently in database:', Array.isArray(files) ? files.length : 'Not array');
  if (Array.isArray(files)) {
    console.log('First 10 files:', files.slice(0, 10).map(f => ({ path: f.path, size: f.size })));
  }
}

inspectAppFiles();
