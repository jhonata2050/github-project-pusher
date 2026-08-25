import fs from 'fs';
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
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function inspectZipContents() {
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const bundlePath = `${appId}/site_bundle.zip`;
  const { data: pubUrl } = supabaseAdmin.storage.from('app-bundles').getPublicUrl(bundlePath);
  const res = await fetch(pubUrl.publicUrl);
  const buf = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  console.log('Total files in bundle:', Object.keys(zip.files).length);
  console.log('Sample entries:', Object.keys(zip.files).slice(0, 15));
}

inspectZipContents();
