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

async function inspectServer() {
  const { data: serverData } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'coolify_servers_registry').maybeSingle();
  let servers = serverData?.value;
  if (typeof servers === 'string') servers = JSON.parse(servers);
  const server = servers?.[0];

  let baseUrl = server.apiUrl.trim().replace(/\/+$/, '');
  if (!baseUrl.endsWith('/api/v1')) baseUrl += '/api/v1';

  const coolifyFetch = async (endpoint) => {
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${server.apiToken.trim()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    return res.json();
  };

  const serversList = await coolifyFetch('/servers');
  console.log('Coolify Servers List:', JSON.stringify(serversList, null, 2));

  const serverDetails = await coolifyFetch('/servers/psy0cumiwl7hhmwld640ut89');
  console.log('Server details ip/user:', serverDetails.ip, serverDetails.user, serverDetails.port);
}

inspectServer();
