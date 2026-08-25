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

async function testOverwritingAllRoots() {
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

  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const appUuid = '9dltqgbguyyylrazdyxaz317';

  // Buscar URLs públicas dos chunks
  const downloadUrls = [];
  for (let i = 1; i <= 6; i++) {
    const { data: pubUrl } = supabaseAdmin.storage.from('app-bundles').getPublicUrl(`${appId}/part_${i}.zip`);
    downloadUrls.push(pubUrl.publicUrl);
  }

  // Caddyfile explícito
  const caddyfile = `:80 {
    root * /var/www/html
    file_server {
        index index.html index.htm edital-em-questoes.html
    }
    encode zstd gzip
    try_files {path} {path}/ /index.html
}
`;
  const caddyfileB64 = Buffer.from(caddyfile).toString('base64');

  const downloadCommands = downloadUrls.map((url, idx) => 
    `curl -sSL -k "${url}" -o /tmp/p${idx}.zip && unzip -o /tmp/p${idx}.zip -d /var/www/html && unzip -o /tmp/p${idx}.zip -d /usr/share/caddy && unzip -o /tmp/p${idx}.zip -d /srv && rm -f /tmp/p${idx}.zip`
  ).join(' && ');

  // Remove o index.html padrão do caddy em /usr/share/caddy e /srv
  const postCmd = `mkdir -p /var/www/html /usr/share/caddy /srv /etc/caddy && rm -rf /usr/share/caddy/* /srv/* && echo "${caddyfileB64}" | base64 -d > /etc/caddy/Caddyfile && ${downloadCommands} && caddy reload --config /etc/caddy/Caddyfile || true`;

  console.log('Atualizando Coolify com remoção do default e extração em todos os roots...');
  await coolifyFetch(`/applications/${appUuid}`, {
    method: 'PATCH',
    body: JSON.stringify({
      post_deployment_command: postCmd,
      static_image: 'caddy:2-alpine',
      ports_exposes: '80',
    })
  });

  console.log('Disparando deploy...');
  await coolifyFetch(`/deploy?uuid=${appUuid}`, { method: 'POST' });

  console.log('Aguardando 15 segundos...');
  await new Promise(r => setTimeout(r, 15000));

  console.log('\n--- Testando https://botstarter512mb.dk1.eqsam.com ---');
  const res = await fetch('https://botstarter512mb.dk1.eqsam.com');
  console.log('HTTP Status:', res.status, res.statusText);
  const body = await res.text();
  console.log('\nHTML retornado (primeiras 25 linhas):\n');
  console.log(body.split('\n').slice(0, 25).join('\n'));
}

testOverwritingAllRoots();
