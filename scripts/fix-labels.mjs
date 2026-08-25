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

async function inspectAndFixLabels() {
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

  const appUuid = '9dltqgbguyyylrazdyxaz317';
  const app = await coolifyFetch(`/applications/${appUuid}`);
  const rawLabels = app.data?.custom_labels;
  const decoded = Buffer.from(rawLabels, 'base64').toString('utf-8');
  console.log('--- Custom Labels Atuais (Decoded) ---');
  console.log(decoded);

  // Remove as linhas de handle_path que corrompem o roteamento
  const fixedLines = decoded
    .split('\n')
    .filter(line => !line.includes('handle_path'))
    .join('\n');

  console.log('\n--- Custom Labels Corrigidas ---');
  console.log(fixedLines);

  const fixedB64 = Buffer.from(fixedLines).toString('base64');
  const patchRes = await coolifyFetch(`/applications/${appUuid}`, {
    method: 'PATCH',
    body: JSON.stringify({
      custom_labels: fixedB64,
    })
  });
  console.log('PATCH Labels Status:', patchRes.status);

  console.log('Disparando deploy com labels corrigidas...');
  await coolifyFetch(`/deploy?uuid=${appUuid}`, { method: 'POST' });

  console.log('Aguardando 15 segundos...');
  await new Promise(r => setTimeout(r, 15000));

  console.log('\n--- Testando Novamente Rotas e Assets ---');
  const routes = [
    'https://botstarter512mb.dk1.eqsam.com/',
    'https://botstarter512mb.dk1.eqsam.com/edital-em-questoes.html',
    'https://botstarter512mb.dk1.eqsam.com/policia_militar-alagoas.html',
    'https://botstarter512mb.dk1.eqsam.com/assets/css/elementor551e.css',
    'https://botstarter512mb.dk1.eqsam.com/minha-rota-spa-teste'
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

inspectAndFixLabels();
