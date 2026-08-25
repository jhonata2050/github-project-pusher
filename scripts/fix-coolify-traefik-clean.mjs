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

async function fixCoolifyTraefikLabels() {
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

  const coolifyAppUuid = '9dltqgbguyyylrazdyxaz317';

  console.log('Restaurando custom_labels limpo no Coolify para gerar Traefik padrão...');
  const patchRes = await coolifyFetch(`/applications/${coolifyAppUuid}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fqdn: 'https://botstarter512mb.dk1.eqsam.com',
      ports_exposes: '80',
      custom_labels: null,
      publish_directory: '/usr/share/caddy',
      static_image: 'caddy:2-alpine',
    }),
  });
  console.log('Patch status:', patchRes.status);

  console.log('Redeploying application...');
  const deployRes = await coolifyFetch('/deploy', {
    method: 'POST',
    body: JSON.stringify({ uuid: coolifyAppUuid, force: true }),
  });
  console.log('Deploy status:', deployRes);
}

fixCoolifyTraefikLabels();
