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

async function setEmptyLabels() {
  const { data: serverData } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'coolify_servers_registry').maybeSingle();
  let servers = serverData?.value;
  if (typeof servers === 'string') servers = JSON.parse(servers);
  const server = servers?.[0];

  let baseUrl = server.apiUrl.trim().replace(/\/+$/, '');
  if (!baseUrl.endsWith('/api/v1')) baseUrl += '/api/v1';

  const coolifyAppUuid = '9dltqgbguyyylrazdyxaz317';

  console.log('Removendo custom_labels para permitir geração automática pelo Coolify...');
  const res = await fetch(`${baseUrl}/applications/${coolifyAppUuid}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${server.apiToken.trim()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      fqdn: 'https://botstarter512mb.dk1.eqsam.com',
      ports_exposes: '80',
      custom_labels: Buffer.from('').toString('base64'),
    }),
  });
  console.log('Patch status:', res.status);
  console.log('Patch response:', await res.text());

  console.log('Deploying application...');
  const deployRes = await fetch(`${baseUrl}/deploy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${server.apiToken.trim()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ uuid: coolifyAppUuid, force: true }),
  });
  console.log('Deploy status:', deployRes.status);
}

setEmptyLabels();
