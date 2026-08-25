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

async function testFullDeployPipeline() {
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

  console.log('1. Compactando arquivos do storage real:', storageDir);
  const zip = new JSZip();

  async function addDir(dir, rel = '') {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      const entryRel = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        await addDir(full, entryRel);
      } else {
        const data = await fsPromises.readFile(full);
        zip.file(entryRel, data);
      }
    }
  }

  await addDir(storageDir);
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  console.log(`ZIP gerado: ${(zipBuf.length / (1024 * 1024)).toFixed(2)} MB`);

  console.log('2. Enviando bundle para Supabase Storage...');
  const bundlePath = `${appId}/bundle.zip`;
  const { data: uploadRes, error: uploadErr } = await supabaseAdmin.storage.from('app-bundles').upload(bundlePath, zipBuf, {
    contentType: 'application/zip',
    upsert: true
  });
  if (uploadErr) throw new Error('Upload error: ' + uploadErr.message);

  const { data: pubUrl } = supabaseAdmin.storage.from('app-bundles').getPublicUrl(bundlePath);
  const downloadUrl = pubUrl.publicUrl;
  console.log('URL de download do bundle:', downloadUrl);

  console.log('3. Gerando Caddyfile e comando de deploy...');
  const caddyfile = `:80 {
    root * /var/www/html
    file_server
    encode zstd gzip
    try_files {path} {path}/ /index.html
}
`;
  const caddyfileB64 = Buffer.from(caddyfile).toString('base64');

  const postCmd = `mkdir -p /var/www/html /usr/share/caddy /srv /etc/caddy && echo "${caddyfileB64}" | base64 -d > /etc/caddy/Caddyfile && curl -sSL -k "${downloadUrl}" -o /tmp/bundle.zip && unzip -o /tmp/bundle.zip -d /var/www/html && cp -r /var/www/html/* /usr/share/caddy/ 2>/dev/null || true && cp -r /var/www/html/* /srv/ 2>/dev/null || true && rm -f /tmp/bundle.zip && caddy reload --config /etc/caddy/Caddyfile || true`;

  console.log('Tamanho do comando post_deployment_command:', postCmd.length, 'bytes (Leve e Seguro!)');

  console.log('4. Atualizando configuração no Coolify...');
  const patchRes = await coolifyFetch(`/applications/${appUuid}`, {
    method: 'PATCH',
    body: JSON.stringify({
      post_deployment_command: postCmd,
      static_image: 'caddy:2-alpine',
      ports_exposes: '80',
    })
  });
  console.log('PATCH Status:', patchRes.status);

  console.log('5. Disparando Deploy no Coolify...');
  const deployRes = await coolifyFetch(`/deploy?uuid=${appUuid}`, {
    method: 'POST'
  });
  console.log('Deploy Status:', deployRes.status, deployRes.data);

  console.log('\n6. Aguardando 12 segundos para conclusão do download e extração no Caddy container...');
  await new Promise(r => setTimeout(r, 12000));

  console.log('\n7. Testando https://botstarter512mb.dk1.eqsam.com...');
  const res = await fetch('https://botstarter512mb.dk1.eqsam.com');
  console.log('HTTP Status:', res.status, res.statusText);
  console.log('Headers:');
  res.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));
  const body = await res.text();
  console.log('\nHTML retornado (primeiros 500 caracteres):\n', body.slice(0, 500));
}

testFullDeployPipeline();
