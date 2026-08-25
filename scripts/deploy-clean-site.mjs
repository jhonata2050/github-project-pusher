import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
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

async function deployCleanSite() {
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
  const storageDir = path.resolve('storage', 'apps', appId, 'public_html');

  console.log('1. Compactando 191 arquivos do site...');
  const zip = new JSZip();

  async function add(d, rel = '') {
    const entries = await fsPromises.readdir(d, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        await add(full, r);
      } else if (!ent.name.endsWith('.zip') && !ent.name.endsWith('.tar') && !ent.name.endsWith('.gz')) {
        const data = await fsPromises.readFile(full);
        zip.file(r, data);
      }
    }
  }

  await add(storageDir);
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  console.log(`ZIP do site pronto: ${(zipBuf.length / (1024 * 1024)).toFixed(2)} MB`);

  console.log('2. Enviando para Supabase Storage...');
  const bundlePath = `${appId}/site_bundle.zip`;
  const { error: upErr } = await supabaseAdmin.storage.from('app-bundles').upload(bundlePath, zipBuf, {
    contentType: 'application/zip',
    upsert: true
  });
  if (upErr) throw new Error('Upload error: ' + upErr.message);

  const { data: pubUrl } = supabaseAdmin.storage.from('app-bundles').getPublicUrl(bundlePath);
  const downloadUrl = pubUrl.publicUrl;
  console.log('URL de download:', downloadUrl);

  console.log('3. Montando Caddyfile e comando de deploy...');
  const caddyfile = `:80 {
    root * /var/www/html
    file_server
    encode zstd gzip
    try_files {path} {path}/ /index.html
}
`;
  const caddyfileB64 = Buffer.from(caddyfile).toString('base64');

  const postCmd = `mkdir -p /var/www/html /usr/share/caddy /srv /etc/caddy && rm -rf /var/www/html/* /usr/share/caddy/* && wget -qO /tmp/site.zip "${downloadUrl}" && unzip -q -o /tmp/site.zip -d /var/www/html && cp -r /var/www/html/* /usr/share/caddy/ 2>/dev/null || true && rm -f /tmp/site.zip && echo "${caddyfileB64}" | base64 -d > /etc/caddy/Caddyfile && caddy reload --config /etc/caddy/Caddyfile || true`;

  console.log('4. Atualizando aplicação no Coolify...');
  await coolifyFetch(`/applications/${appUuid}`, {
    method: 'PATCH',
    body: JSON.stringify({
      publish_directory: '/var/www/html',
      static_image: 'caddy:2-alpine',
      post_deployment_command: postCmd,
    })
  });

  console.log('5. Disparando deploy...');
  await coolifyFetch(`/deploy?uuid=${appUuid}`, { method: 'POST' });

  console.log('6. Aguardando 20 segundos para conclusão...');
  await new Promise(r => setTimeout(r, 20000));

  console.log('\n--- 7. Testando Todas as Rotas e Assets no Domínio Real ---');
  const routes = [
    'https://botstarter512mb.dk1.eqsam.com/',
    'https://botstarter512mb.dk1.eqsam.com/edital-em-questoes.html',
    'https://botstarter512mb.dk1.eqsam.com/policia_militar-alagoas.html',
    'https://botstarter512mb.dk1.eqsam.com/assets/css/elementor551e.css',
    'https://botstarter512mb.dk1.eqsam.com/assets/img/log-pzero.png',
  ];

  for (const url of routes) {
    try {
      const res = await fetch(url);
      console.log(`[${res.status} ${res.statusText}] Content-Type: ${res.headers.get('content-type')} -> ${url}`);
    } catch (e) {
      console.error(`[ERRO] ${url}:`, e.message);
    }
  }
}

deployCleanSite().catch(e => console.error('Erro:', e));
