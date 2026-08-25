import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
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

async function syncAndFixCaddy() {
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

  console.log('Lendo arquivos do storage real:', storageDir);
  const filesList = [];

  async function readDirRecursive(dir, baseRel = '') {
    if (!fs.existsSync(dir)) return;
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      const rel = baseRel ? `${baseRel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        await readDirRecursive(full, rel);
      } else {
        const content = await fsPromises.readFile(full);
        filesList.push({ path: rel, buffer: content });
      }
    }
  }

  await readDirRecursive(storageDir);
  console.log(`Encontrados ${filesList.length} arquivos físicos no disco:`, filesList.map(f => f.path));

  // Caddyfile com suporte a SPA fallback e arquivo estático
  const caddyfile = `:80 {
    root * /var/www/html
    file_server
    encode zstd gzip
    try_files {path} {path}/ /index.html
}
`;
  const caddyfileB64 = Buffer.from(caddyfile).toString('base64');

  const commands = [
    'mkdir -p /var/www/html /usr/share/caddy /srv /etc/caddy',
    `echo "${caddyfileB64}" | base64 -d > /etc/caddy/Caddyfile`
  ];

  for (const f of filesList) {
    const b64 = f.buffer.toString('base64');
    const dir = f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : '';
    if (dir) {
      commands.push(`mkdir -p /var/www/html/${dir} /usr/share/caddy/${dir} /srv/${dir}`);
    }
    commands.push(`echo "${b64}" | base64 -d > /var/www/html/${f.path}`);
    commands.push(`echo "${b64}" | base64 -d > /usr/share/caddy/${f.path}`);
    commands.push(`echo "${b64}" | base64 -d > /srv/${f.path}`);
  }

  commands.push('caddy reload --config /etc/caddy/Caddyfile || true');

  const postCmd = commands.join(' && ');
  console.log('\nTamanho total do post_deployment_command:', postCmd.length, 'bytes');

  console.log('\nAtualizando aplicação no Coolify...');
  const patchRes = await coolifyFetch(`/applications/${appUuid}`, {
    method: 'PATCH',
    body: JSON.stringify({
      post_deployment_command: postCmd,
      static_image: 'caddy:2-alpine',
      ports_exposes: '80',
    })
  });
  console.log('PATCH Status:', patchRes.status);

  console.log('Disparando deploy da aplicação no Coolify...');
  const deployRes = await coolifyFetch(`/deploy?uuid=${appUuid}`, {
    method: 'POST'
  });
  console.log('Deploy Status:', deployRes.status, deployRes.data);

  console.log('\nAguardando 8 segundos para inicialização do container...');
  await new Promise(r => setTimeout(r, 8000));

  console.log('\n--- Testando acesso ao domínio https://botstarter512mb.dk1.eqsam.com ---');
  try {
    const res = await fetch('https://botstarter512mb.dk1.eqsam.com');
    console.log('Status:', res.status, res.statusText);
    const body = await res.text();
    console.log('Body (primeiros 300 caracteres):\n', body.slice(0, 300));
  } catch (e) {
    console.error('Erro ao acessar:', e.message);
  }
}

syncAndFixCaddy();
