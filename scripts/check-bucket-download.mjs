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
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkBucket() {
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const bundlePath = `${appId}/site_bundle.zip`;
  const { data: pubUrl } = supabaseAdmin.storage.from('app-bundles').getPublicUrl(bundlePath);
  console.log('Public URL:', pubUrl.publicUrl);

  const res = await fetch(pubUrl.publicUrl);
  console.log('Download Status:', res.status);
  const text = await res.text();
  console.log('Response (first 100 bytes):', text.slice(0, 100));
}

checkBucket();
