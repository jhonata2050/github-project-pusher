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
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkServersTable() {
  const { data, error } = await supabaseAdmin.from('servers').select('*');
  console.log('Servers count:', data?.length);
  if (data && data.length > 0) {
    const s = data[0];
    console.log('Server ID:', s.id, 'IP:', s.ip, 'SSH Port:', s.ssh_port, 'SSH User:', s.ssh_user, 'Has Key:', Boolean(s.ssh_key));
  }
}

checkServersTable();
