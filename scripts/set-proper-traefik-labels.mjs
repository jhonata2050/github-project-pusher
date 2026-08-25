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

async function setProperTraefikLabels() {
  const { data: serverData } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'coolify_servers_registry').maybeSingle();
  let servers = serverData?.value;
  if (typeof servers === 'string') servers = JSON.parse(servers);
  const server = servers?.[0];

  let baseUrl = server.apiUrl.trim().replace(/\/+$/, '');
  if (!baseUrl.endsWith('/api/v1')) baseUrl += '/api/v1';

  const coolifyAppUuid = '9dltqgbguyyylrazdyxaz317';
  const domain = 'botstarter512mb.dk1.eqsam.com';

  const labelsText = [
    'traefik.enable=true',
    `traefik.http.routers.http-0-${coolifyAppUuid}.entryPoints=http`,
    `traefik.http.routers.http-0-${coolifyAppUuid}.rule=Host(\`${domain}\`)`,
    `traefik.http.routers.http-0-${coolifyAppUuid}.service=http-0-${coolifyAppUuid}`,
    `traefik.http.routers.http-0-${coolifyAppUuid}.middlewares=redirect-to-https`,
    'traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https',
    `traefik.http.routers.https-0-${coolifyAppUuid}.entryPoints=https`,
    `traefik.http.routers.https-0-${coolifyAppUuid}.rule=Host(\`${domain}\`)`,
    `traefik.http.routers.https-0-${coolifyAppUuid}.service=http-0-${coolifyAppUuid}`,
    `traefik.http.routers.https-0-${coolifyAppUuid}.tls=true`,
    `traefik.http.routers.https-0-${coolifyAppUuid}.tls.certresolver=letsencrypt`,
    `traefik.http.services.http-0-${coolifyAppUuid}.loadbalancer.server.port=80`,
    `caddy_0=https://${domain}`,
    'caddy_0.reverse_proxy={{upstreams 80}}',
  ].join('\n');

  const labelsB64 = Buffer.from(labelsText).toString('base64');

  console.log('Atualizando custom_labels válidos no Coolify...');
  const res = await fetch(`${baseUrl}/applications/${coolifyAppUuid}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${server.apiToken.trim()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      custom_labels: labelsB64,
    }),
  });
  console.log('Status:', res.status);
  console.log('Response:', await res.text());

  console.log('Disparando deploy forçado...');
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

setProperTraefikLabels();
