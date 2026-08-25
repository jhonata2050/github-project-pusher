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

const apiUrl = 'https://dk1.eqsam.com/api/v1';
const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';

async function testFullApply() {
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' };
  
  const serversRes = await fetch(`${apiUrl}/servers`, { headers });
  const serverUuid = (await serversRes.json())[0]?.uuid;

  const projectsRes = await fetch(`${apiUrl}/projects`, { headers });
  const projectUuid = (await projectsRes.json())[0]?.uuid;

  console.log(`Using Server: ${serverUuid}, Project: ${projectUuid}`);

  // Test creating Fastify Starter
  const payload = {
    name: 'fastify-api-test',
    project_uuid: projectUuid,
    environment_name: 'production',
    server_uuid: serverUuid,
    build_pack: 'nixpacks',
    git_repository: 'https://github.com/fastify/fastify-example-twitter',
    git_branch: 'master',
    ports_exposes: '3000',
    limits_memory: '512m',
    limits_cpus: '1'
  };

  const createRes = await fetch(`${apiUrl}/applications/public`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const app = await createRes.json();
  console.log('Created App in Coolify:', app);
}

testFullApply();
