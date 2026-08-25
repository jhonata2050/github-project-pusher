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

async function fixPostCmd() {
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
  const coolifyAppUuid = '9dltqgbguyyylrazdyxaz317';
  const bundlePath = `${appId}/site_bundle.zip`;
  const { data: pubUrl } = supabaseAdmin.storage.from('app-bundles').getPublicUrl(bundlePath);
  const downloadUrl = pubUrl.publicUrl;

  const caddyfile = `:80 {\n    root * /var/www/html\n    file_server\n    encode zstd gzip\n    try_files {path} {path}/ /index.html\n}\n`;
  const caddyfileB64 = Buffer.from(caddyfile).toString('base64');

  // Comando com apk add unzip wget curl para garantir que o unzip existe no Alpine
  const postCmd = `apk add --no-cache unzip wget curl && mkdir -p /var/www/html /usr/share/caddy /srv /etc/caddy && rm -rf /var/www/html/* /usr/share/caddy/* && wget -qO /tmp/site.zip "${downloadUrl}" && unzip -q -o /tmp/site.zip -d /var/www/html && cp -r /var/www/html/* /usr/share/caddy/ 2>/dev/null || true && rm -f /tmp/site.zip && echo "${caddyfileB64}" | base64 -d > /etc/caddy/Caddyfile && caddy reload --config /etc/caddy/Caddyfile || true`;

  console.log('Atualizando aplicação no Coolify...');
  const patchRes = await coolifyFetch(`/applications/${coolifyAppUuid}`, {
    method: 'PATCH',
    body: JSON.stringify({
      publish_directory: '/var/www/html',
      static_image: 'caddy:2-alpine',
      post_deployment_command: postCmd,
    }),
  });
  console.log('Patch result:', patchRes.status);

  console.log('Disparando deploy forçado...');
  const deployRes = await coolifyFetch('/deploy', {
    method: 'POST',
    body: JSON.stringify({ uuid: coolifyAppUuid, force: true }),
  });
  console.log('Deploy result:', deployRes);
}

fixPostCmd();
