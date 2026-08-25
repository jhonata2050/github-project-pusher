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

async function runTC02() {
  console.log('--- TC-02: Teste de Criação de Novo Arquivo e Acesso Web ---');
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';
  const coolifyUuid = '9dltqgbguyyylrazdyxaz317';
  
  const sobreHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Sobre Nós — Eqsam Teste TC-02</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 50px; text-align: center; }
    h1 { color: #38bdf8; }
  </style>
</head>
<body>
  <h1>🏢 Página Sobre Nós Criada via Painel!</h1>
  <p>Esta página foi gerada no teste automatizado TC-02 e servida pelo Caddy Server.</p>
</body>
</html>`;

  const { data: existing } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'app_files_' + appId).maybeSingle();
  let files = existing?.value || [];
  if (typeof files === 'string') files = JSON.parse(files);

  const idx = files.findIndex(f => f.path === 'sobre.html');
  if (idx >= 0) {
    files[idx] = { ...files[idx], content: sobreHtml, updated_at: new Date().toISOString() };
  } else {
    files.push({
      path: 'sobre.html',
      name: 'sobre.html',
      type: 'file',
      size: '500 B',
      content: sobreHtml,
      updated_at: new Date().toISOString()
    });
  }

  await supabaseAdmin.from('system_settings').upsert({
    key: 'app_files_' + appId,
    value: files,
    updated_at: new Date().toISOString()
  }, { onConflict: 'key' });

  console.log('[Supabase] Arquivo sobre.html registrado no banco.');

  // Sincronizar com Coolify
  const commands = ['mkdir -p /var/www/html /usr/share/caddy'];
  for (const f of files) {
    if (f.content) {
      const b64 = Buffer.from(f.content).toString('base64');
      commands.push(`echo "${b64}" | base64 -d > /var/www/html/${f.path}`);
      commands.push(`echo "${b64}" | base64 -d > /usr/share/caddy/${f.path}`);
    }
  }

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

  // Aguardar 10s para o deploy finalizar
  console.log('[Coolify] Aguardando 10s para finalização do deploy...');
  await new Promise(r => setTimeout(r, 10000));

  const resSobre = await fetch('https://botstarter512mb.dk1.eqsam.com/sobre.html');
  console.log('[HTTPS Web sobre.html] Status:', resSobre.status, resSobre.statusText);
  const text = await resSobre.text();
  console.log('[HTTPS Web Content]:', text.slice(0, 200).replace(/\n/g, ' '));
}

runTC02();
