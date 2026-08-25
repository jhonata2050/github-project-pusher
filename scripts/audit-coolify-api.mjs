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

async function testCoolifyApiCapabilities() {
  const { data: serverData } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'coolify_servers_registry').maybeSingle();
  let servers = serverData?.value;
  if (typeof servers === 'string') servers = JSON.parse(servers);
  const server = servers?.[0];

  let baseUrl = server.apiUrl.trim().replace(/\/+$/, '');
  if (!baseUrl.endsWith('/api/v1')) baseUrl += '/api/v1';

  const coolifyFetch = async (endpoint, options = {}) => {
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${server.apiToken.trim()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    });
    const text = await res.text();
    try { return { status: res.status, data: JSON.parse(text) }; } catch(e) { return { status: res.status, text }; }
  };

  const appUuid = '9dltqgbguyyylrazdyxaz317';
  console.log('\n--- Testando detalhes do app ---');
  const appDetails = await coolifyFetch(`/applications/${appUuid}`);
  console.log('App details status:', appDetails.status, 'Name:', appDetails.data?.name, 'Status:', appDetails.data?.status);
  console.log('App keys:', Object.keys(appDetails.data || {}));

  console.log('\n--- Testando endpoints de execução / comandos no Coolify ---');
  const serverUuid = 'psy0cumiwl7hhmwld640ut89';
  const endpointsToTest = [
    { ep: `/applications/${appUuid}/execute`, method: 'POST', body: { command: 'ls -la' } },
    { ep: `/applications/${appUuid}/exec`, method: 'POST', body: { command: 'ls -la' } },
    { ep: `/applications/${appUuid}/command`, method: 'POST', body: { command: 'ls -la' } },
    { ep: `/servers/${serverUuid}/execute`, method: 'POST', body: { command: 'ls -la' } },
    { ep: `/servers/${serverUuid}/command`, method: 'POST', body: { command: 'ls -la' } },
  ];

  for (const item of endpointsToTest) {
    const res = await coolifyFetch(item.ep, { method: item.method, body: JSON.stringify(item.body) });
    console.log(`Endpoint ${item.ep}: Status ${res.status}`, res.status === 200 ? res.data : (res.data?.message || ''));
  }
}

testCoolifyApiCapabilities();
