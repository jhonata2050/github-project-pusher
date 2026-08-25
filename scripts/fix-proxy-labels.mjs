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

async function fixReverseProxyLabels() {
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

  const labels = `traefik.enable=true
traefik.http.middlewares.gzip.compress=true
traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https
traefik.http.routers.http-0-9dltqgbguyyylrazdyxaz317.entryPoints=http
traefik.http.routers.http-0-9dltqgbguyyylrazdyxaz317.middlewares=gzip
traefik.http.routers.http-0-9dltqgbguyyylrazdyxaz317.rule=Host(\`9dltqgbguyyylrazdyxaz317.dk1.eqsam.com\`) && PathPrefix(\`/\`)
traefik.http.routers.http-0-9dltqgbguyyylrazdyxaz317.service=http-0-9dltqgbguyyylrazdyxaz317
traefik.http.routers.http-1-9dltqgbguyyylrazdyxaz317.entryPoints=http
traefik.http.routers.http-1-9dltqgbguyyylrazdyxaz317.middlewares=redirect-to-https
traefik.http.routers.http-1-9dltqgbguyyylrazdyxaz317.rule=Host(\`9dltqgbguyyylrazdyxaz317.dk1.eqsam.com\`) && PathPrefix(\`/\`)
traefik.http.routers.http-1-9dltqgbguyyylrazdyxaz317.service=http-1-9dltqgbguyyylrazdyxaz317
traefik.http.routers.http-2-9dltqgbguyyylrazdyxaz317.entryPoints=http
traefik.http.routers.http-2-9dltqgbguyyylrazdyxaz317.middlewares=gzip
traefik.http.routers.http-2-9dltqgbguyyylrazdyxaz317.rule=Host(\`botstarter512mb.dk1.eqsam.com\`) && PathPrefix(\`/\`)
traefik.http.routers.http-2-9dltqgbguyyylrazdyxaz317.service=http-2-9dltqgbguyyylrazdyxaz317
traefik.http.routers.http-3-9dltqgbguyyylrazdyxaz317.entryPoints=http
traefik.http.routers.http-3-9dltqgbguyyylrazdyxaz317.middlewares=redirect-to-https
traefik.http.routers.http-3-9dltqgbguyyylrazdyxaz317.rule=Host(\`botstarter512mb.dk1.eqsam.com\`) && PathPrefix(\`/\`)
traefik.http.routers.http-3-9dltqgbguyyylrazdyxaz317.service=http-3-9dltqgbguyyylrazdyxaz317
traefik.http.routers.https-1-9dltqgbguyyylrazdyxaz317.entryPoints=https
traefik.http.routers.https-1-9dltqgbguyyylrazdyxaz317.middlewares=gzip
traefik.http.routers.https-1-9dltqgbguyyylrazdyxaz317.rule=Host(\`9dltqgbguyyylrazdyxaz317.dk1.eqsam.com\`) && PathPrefix(\`/\`)
traefik.http.routers.https-1-9dltqgbguyyylrazdyxaz317.service=https-1-9dltqgbguyyylrazdyxaz317
traefik.http.routers.https-1-9dltqgbguyyylrazdyxaz317.tls.certresolver=letsencrypt
traefik.http.routers.https-1-9dltqgbguyyylrazdyxaz317.tls=true
traefik.http.routers.https-3-9dltqgbguyyylrazdyxaz317.entryPoints=https
traefik.http.routers.https-3-9dltqgbguyyylrazdyxaz317.middlewares=gzip
traefik.http.routers.https-3-9dltqgbguyyylrazdyxaz317.rule=Host(\`botstarter512mb.dk1.eqsam.com\`) && PathPrefix(\`/\`)
traefik.http.routers.https-3-9dltqgbguyyylrazdyxaz317.service=https-3-9dltqgbguyyylrazdyxaz317
traefik.http.routers.https-3-9dltqgbguyyylrazdyxaz317.tls.certresolver=letsencrypt
traefik.http.routers.https-3-9dltqgbguyyylrazdyxaz317.tls=true
traefik.http.services.http-0-9dltqgbguyyylrazdyxaz317.loadbalancer.server.port=80
traefik.http.services.http-1-9dltqgbguyyylrazdyxaz317.loadbalancer.server.port=80
traefik.http.services.http-2-9dltqgbguyyylrazdyxaz317.loadbalancer.server.port=80
traefik.http.services.http-3-9dltqgbguyyylrazdyxaz317.loadbalancer.server.port=80
traefik.http.services.https-1-9dltqgbguyyylrazdyxaz317.loadbalancer.server.port=80
traefik.http.services.https-3-9dltqgbguyyylrazdyxaz317.loadbalancer.server.port=80
caddy_0.encode=zstd gzip
caddy_0.header=-Server
caddy_0.reverse_proxy={{upstreams 80}}
caddy_0=http://9dltqgbguyyylrazdyxaz317.dk1.eqsam.com
caddy_1.encode=zstd gzip
caddy_1.header=-Server
caddy_1.reverse_proxy={{upstreams 80}}
caddy_1=https://9dltqgbguyyylrazdyxaz317.dk1.eqsam.com
caddy_2.encode=zstd gzip
caddy_2.header=-Server
caddy_2.reverse_proxy={{upstreams 80}}
caddy_2=http://botstarter512mb.dk1.eqsam.com
caddy_3.encode=zstd gzip
caddy_3.header=-Server
caddy_3.reverse_proxy={{upstreams 80}}
caddy_3=https://botstarter512mb.dk1.eqsam.com
caddy_ingress_network=coolify`;

  console.log('Atualizando custom_labels com reverse_proxy={{upstreams 80}}...');
  const patchRes = await coolifyFetch(`/applications/${appUuid}`, {
    method: 'PATCH',
    body: JSON.stringify({
      custom_labels: Buffer.from(labels).toString('base64'),
    })
  });
  console.log('PATCH Status:', patchRes.status);

  console.log('Disparando deploy...');
  await coolifyFetch(`/deploy?uuid=${appUuid}`, { method: 'POST' });

  console.log('Aguardando 15 segundos...');
  await new Promise(r => setTimeout(r, 15000));

  console.log('\n--- Testando Rotas e Assets ---');
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

fixReverseProxyLabels();
