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

async function testDirectHtml() {
  const { data: serverData } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'coolify_servers_registry').maybeSingle();
  let servers = serverData?.value;
  if (typeof servers === 'string') servers = JSON.parse(servers);
  const server = servers?.[0];

  let baseUrl = server.apiUrl.trim().replace(/\/+$/, '');
  if (!baseUrl.endsWith('/api/v1')) baseUrl += '/api/v1';

  const coolifyAppUuid = '9dltqgbguyyylrazdyxaz317';

  const caddyfile = `:80 {\n    root * /usr/share/caddy\n    file_server\n    encode zstd gzip\n    try_files {path} {path}/ /index.html\n}\n`;
  const caddyfileB64 = Buffer.from(caddyfile).toString('base64');

  const postCmd = `mkdir -p /usr/share/caddy /var/www/html /etc/caddy && echo "<h1>Colify Host Online</h1><p>Dominio ativo e funcionando!</p>" > /usr/share/caddy/index.html && echo "${caddyfileB64}" | base64 -d > /etc/caddy/Caddyfile && caddy reload --config /etc/caddy/Caddyfile || true`;

  console.log('Gravando index.html de teste no Caddy...');
  await fetch(`${baseUrl}/applications/${coolifyAppUuid}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${server.apiToken.trim()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      publish_directory: '/usr/share/caddy',
      static_image: 'caddy:2-alpine',
      post_deployment_command: postCmd,
    }),
  });

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

testDirectHtml();
