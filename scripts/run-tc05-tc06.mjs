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

async function runTC05andTC06() {
  console.log('--- TC-05 & TC-06: Teste de Exclusão de Arquivo e Verificação de 404 ---');
  
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';
  const coolifyUuid = '9dltqgbguyyylrazdyxaz317';

  // 1. Obter arquivos atuais e remover contato.html
  const { data: existing } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'app_files_' + appId).maybeSingle();
  let files = existing?.value || [];
  if (typeof files === 'string') files = JSON.parse(files);

  const filtered = files.filter(f => f.path !== 'contato.html');
  console.log('[Exclusão] contato.html removido da lista. Arquivos restantes:', filtered.map(f => f.path));

  await supabaseAdmin.from('system_settings').upsert({
    key: 'app_files_' + appId,
    value: filtered,
    updated_at: new Date().toISOString()
  }, { onConflict: 'key' });

  // 2. Limpar e sincronizar container do Caddy
  const defaultCaddyfile = `:80 {
    root * /var/www/html
    file_server
    encode zstd gzip
    try_files {path} /index.html
}
`;
  const caddyfileB64 = Buffer.from(defaultCaddyfile).toString('base64');

  const commands = [
    'rm -rf /var/www/html/* /usr/share/caddy/* /srv/*',
    'mkdir -p /var/www/html /usr/share/caddy /srv /etc/caddy',
    `echo "${caddyfileB64}" | base64 -d > /etc/caddy/Caddyfile`
  ];

  for (const f of filtered) {
    const b64 = Buffer.from(f.content).toString('base64');
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

  const patchRes = await fetch(`https://dk1.eqsam.com/api/v1/applications/${coolifyUuid}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      post_deployment_command: postCmd,
      static_image: 'caddy:2-alpine'
    })
  });
  console.log('[Coolify] PATCH status:', patchRes.status);

  const deployRes = await fetch(`https://dk1.eqsam.com/api/v1/deploy?uuid=${coolifyUuid}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  console.log('[Coolify] Deploy status:', deployRes.status);

  console.log('[Coolify] Aguardando 12s...');
  await new Promise(r => setTimeout(r, 12000));

  // 3. Validar que index.html continua respondendo e contato.html retorna index.html (SPA try_files) ou 404
  const resIndex = await fetch('https://botstarter512mb.dk1.eqsam.com');
  console.log('[HTTPS index.html Status]:', resIndex.status);

  const resContato = await fetch('https://botstarter512mb.dk1.eqsam.com/contato.html');
  const textContato = await resContato.text();
  console.log('[HTTPS contato.html Status]:', resContato.status);
  console.log('[HTTPS contato.html Body contains "Fale Conosco"?]:', textContato.includes('Fale Conosco'));
}

runTC05andTC06();
