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

async function fixCaddyPermissions() {
  const { data: serverData } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'coolify_servers_registry').maybeSingle();
  let servers = serverData?.value;
  if (typeof servers === 'string') servers = JSON.parse(servers);
  const server = servers?.[0];

  let baseUrl = server.apiUrl.trim().replace(/\/+$/, '');
  if (!baseUrl.endsWith('/api/v1')) baseUrl += '/api/v1';

  const coolifyAppUuid = '9dltqgbguyyylrazdyxaz317';
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';

  const bundlePath = `${appId}/site_bundle.zip`;
  const { data: pubUrl } = supabaseAdmin.storage.from('app-bundles').getPublicUrl(bundlePath);
  const downloadUrl = pubUrl.publicUrl;

  const caddyfile = `:80 {\n    root * /usr/share/caddy\n    file_server\n    encode zstd gzip\n    try_files {path} {path}/ /index.html\n}\n`;
  const caddyfileB64 = Buffer.from(caddyfile).toString('base64');

  const postCmd = `apk add --no-cache unzip wget curl && mkdir -p /usr/share/caddy /var/www/html /etc/caddy && rm -rf /usr/share/caddy/* /var/www/html/* && wget -qO /tmp/site.zip "${downloadUrl}" && unzip -q -o /tmp/site.zip -d /usr/share/caddy && cp -r /usr/share/caddy/* /var/www/html/ 2>/dev/null || true && chmod -R 755 /usr/share/caddy /var/www/html && chown -R caddy:caddy /usr/share/caddy /var/www/html 2>/dev/null || true && rm -f /tmp/site.zip && echo "${caddyfileB64}" | base64 -d > /etc/caddy/Caddyfile && caddy reload --config /etc/caddy/Caddyfile || true`;

  console.log('Atualizando post_deployment_command com permissões 755...');
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

fixCaddyPermissions();
