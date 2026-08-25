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

async function inspectCoolifyApp() {
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
  console.log('\n--- 1. Detalhes da Aplicação Coolify ---');
  const appRes = await coolifyFetch(`/applications/${appUuid}`);
  console.log('FQDN:', appRes.data?.fqdn);
  console.log('Build Pack:', appRes.data?.build_pack);
  console.log('Status:', appRes.data?.status);
  console.log('Static Image:', appRes.data?.static_image);
  console.log('Base Directory:', appRes.data?.base_directory);
  console.log('Publish Directory:', appRes.data?.publish_directory);
  console.log('Ports Exposes:', appRes.data?.ports_exposes);
  console.log('Ports Mappings:', appRes.data?.ports_mappings);
  console.log('Custom Docker Run Options:', appRes.data?.custom_docker_run_options);
  console.log('Custom Labels:', appRes.data?.custom_labels);
  console.log('Dockerfile location / content:', appRes.data?.dockerfile_location, appRes.data?.dockerfile);
  console.log('Post Deployment Command:', appRes.data?.post_deployment_command);

  console.log('\n--- 2. Logs da Aplicação Coolify ---');
  const logsRes = await coolifyFetch(`/applications/${appUuid}/logs`);
  console.log('Logs (últimos 1000 caracteres):');
  console.log(typeof logsRes.data === 'string' ? logsRes.data.slice(-1000) : JSON.stringify(logsRes.data).slice(-1000));

  console.log('\n--- 3. Deployments Recentes ---');
  const depsRes = await coolifyFetch(`/deployments`);
  console.log('Deployments status:', depsRes.status, Array.isArray(depsRes.data) ? depsRes.data.slice(0, 3) : depsRes.data);
}

inspectCoolifyApp();
