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

async function deployWithChunkedBundles() {
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

  // Coletar todos os arquivos (excluindo zips pesados aninhados se houver)
  const allFiles = [];
  async function collect(d, rel = '') {
    const entries = await fsPromises.readdir(d, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        await collect(full, r);
      } else {
        const stat = await fsPromises.stat(full);
        allFiles.push({ path: r, fullPath: full, size: stat.size });
      }
    }
  }
  await collect(storageDir);
  console.log(`Total de arquivos para empacotar: ${allFiles.length}`);

  // Agrupar arquivos em pacotes de no máximo 20 MB cada
  const MAX_CHUNK_BYTES = 20 * 1024 * 1024;
  const chunks = [];
  let currentChunk = [];
  let currentChunkSize = 0;

  for (const file of allFiles) {
    if (currentChunkSize + file.size > MAX_CHUNK_BYTES && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChunkSize = 0;
    }
    currentChunk.push(file);
    currentChunkSize += file.size;
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  console.log(`Arquivos divididos em ${chunks.length} pacote(s) seguro(s).`);

  const downloadUrls = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkFiles = chunks[i];
    const zip = new JSZip();
    for (const f of chunkFiles) {
      const data = await fsPromises.readFile(f.fullPath);
      zip.file(f.path, data);
    }
    const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    console.log(`Pacote ${i + 1}/${chunks.length}: ${(zipBuf.length / (1024 * 1024)).toFixed(2)} MB (${chunkFiles.length} arquivos)`);

    const bundlePath = `${appId}/part_${i + 1}.zip`;
    const { error: upErr } = await supabaseAdmin.storage.from('app-bundles').upload(bundlePath, zipBuf, {
      contentType: 'application/zip',
      upsert: true
    });
    if (upErr) throw new Error(`Erro no upload do chunk ${i + 1}: ${upErr.message}`);

    const { data: pubUrl } = supabaseAdmin.storage.from('app-bundles').getPublicUrl(bundlePath);
    downloadUrls.push(pubUrl.publicUrl);
  }

  console.log('Todos os pacotes foram enviados com sucesso!');

  // Caddyfile com SPA fallback & file server
  const caddyfile = `:80 {
    root * /var/www/html
    file_server
    encode zstd gzip
    try_files {path} {path}/ /index.html
}
`;
  const caddyfileB64 = Buffer.from(caddyfile).toString('base64');

  const downloadCommands = downloadUrls.map((url, idx) => 
    `curl -sSL -k "${url}" -o /tmp/p${idx}.zip && unzip -o /tmp/p${idx}.zip -d /var/www/html && rm -f /tmp/p${idx}.zip`
  ).join(' && ');

  const postCmd = `mkdir -p /var/www/html /usr/share/caddy /srv /etc/caddy && echo "${caddyfileB64}" | base64 -d > /etc/caddy/Caddyfile && ${downloadCommands} && cp -r /var/www/html/* /usr/share/caddy/ 2>/dev/null || true && cp -r /var/www/html/* /srv/ 2>/dev/null || true && caddy reload --config /etc/caddy/Caddyfile || true`;

  console.log('\nComando de deploy final montado (Tamanho:', postCmd.length, 'bytes):');

  console.log('Atualizando aplicação no Coolify...');
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

  console.log('Aguardando 15 segundos para download e recarregamento do Caddy...');
  await new Promise(r => setTimeout(r, 15000));

  console.log('\n--- Testando acesso ao domínio https://botstarter512mb.dk1.eqsam.com ---');
  const res = await fetch('https://botstarter512mb.dk1.eqsam.com');
  console.log('HTTP Status:', res.status, res.statusText);
  console.log('Headers:');
  res.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));
  const body = await res.text();
  console.log('\nHTML retornado (primeiros 500 caracteres):\n', body.slice(0, 500));
}

deployWithChunkedBundles().catch(e => console.error('Erro:', e));
