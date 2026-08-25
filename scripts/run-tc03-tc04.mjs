import JSZip from 'jszip';
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

async function runTC03andTC04() {
  console.log('--- TC-03 & TC-04: Teste de Extração de ZIP e Normalização de Pastas ---');
  
  // 1. Criar um arquivo ZIP simulando um projeto real compactado com pasta pai
  const zip = new JSZip();
  zip.file('meu-projeto-web/index.html', `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Site Oficial Descompactado via ZIP</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <h1>🎉 Site Extraído com Sucesso do Arquivo ZIP!</h1>
  <p>Este site foi enviado em formato .ZIP e descompactado na raiz /var/www/html sem a pasta pai duplicada.</p>
  <a href="contato.html">Página de Contato</a>
  <script src="js/app.js"></script>
</body>
</html>`);

  zip.file('meu-projeto-web/contato.html', `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Contato</title></head>
<body><h1>Fale Conosco — Teste de ZIP</h1><p>Email: contato@eqsam.com</p></body>
</html>`);

  zip.file('meu-projeto-web/css/style.css', `body { font-family: sans-serif; background: #111827; color: #f9fafb; padding: 40px; }`);
  zip.file('meu-projeto-web/js/app.js', `console.log("JavaScript carregado com sucesso!");`);

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  console.log('[ZIP Generator] Pacote ZIP criado com tamanho:', zipBuffer.length, 'bytes');

  // 2. Executar a lógica do cliente (unzipping + unwrap de pasta pai)
  const loadedZip = await JSZip.loadAsync(zipBuffer);
  const rawEntries = Object.keys(loadedZip.files).filter(
    name => !loadedZip.files[name].dir && !name.startsWith('__MACOSX/') && !name.includes('.DS_Store')
  );

  const firstSlash = rawEntries[0].indexOf('/');
  let commonPrefix = '';
  if (firstSlash > 0) {
    const potential = rawEntries[0].substring(0, firstSlash + 1);
    if (rawEntries.every(name => name.startsWith(potential))) {
      commonPrefix = potential;
    }
  }
  console.log('[Normalizador] Prefixo comum detectado para remoção:', commonPrefix);

  const filesToSave = [];
  for (const filename of rawEntries) {
    const entry = loadedZip.files[filename];
    const cleanPath = commonPrefix ? filename.substring(commonPrefix.length) : filename;
    const content = await entry.async('string');
    filesToSave.push({ path: cleanPath, content });
  }

  console.log('[Arquivos Extraídos]:', filesToSave.map(f => f.path));

  // 3. Salvar no Supabase e Coolify
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';
  const coolifyUuid = '9dltqgbguyyylrazdyxaz317';

  const defaultCaddyfile = `:80 {
    root * /var/www/html
    file_server
    encode zstd gzip
    try_files {path} /index.html
}
`;
  const caddyfileB64 = Buffer.from(defaultCaddyfile).toString('base64');

  const commands = [
    'mkdir -p /var/www/html /usr/share/caddy /srv /etc/caddy',
    `echo "${caddyfileB64}" | base64 -d > /etc/caddy/Caddyfile`
  ];

  for (const f of filesToSave) {
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

  console.log('[Coolify] Enviando arquivos para o container...');
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

  console.log('[Coolify] Aguardando 12s para deploy finalizar...');
  await new Promise(r => setTimeout(r, 12000));

  // 4. Validar resposta no Caddy
  const resIndex = await fetch('https://botstarter512mb.dk1.eqsam.com');
  console.log('[HTTPS index.html Status]:', resIndex.status);
  const textIndex = await resIndex.text();
  console.log('[HTTPS index.html Content]:', textIndex.slice(0, 150).replace(/\n/g, ' '));

  const resContato = await fetch('https://botstarter512mb.dk1.eqsam.com/contato.html');
  console.log('[HTTPS contato.html Status]:', resContato.status);
  const textContato = await resContato.text();
  console.log('[HTTPS contato.html Content]:', textContato.slice(0, 150).replace(/\n/g, ' '));
}

runTC03andTC04();
