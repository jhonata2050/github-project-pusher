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

async function testUploadZip() {
  const JSZip = (await import('jszip')).default;
  const fsPromises = await import('fs/promises');
  const path = await import('path');

  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const clientRoot = path.resolve('storage', 'apps', appId, 'public_html');

  const zip = new JSZip();
  let count = 0;

  async function addRecursive(d, rel = '') {
    const entries = await fsPromises.readdir(d, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        await addRecursive(full, r);
      } else if (!ent.name.endsWith('.zip') && !ent.name.endsWith('.tar') && !ent.name.endsWith('.gz')) {
        const data = await fsPromises.readFile(full);
        zip.file(r.replace(/\\/g, '/'), data);
        count++;
      }
    }
  }

  await addRecursive(clientRoot);
  console.log(`Compactando ${count} arquivos...`);

  const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  console.log(`Buffer ZIP gerado: ${(zipBuf.length / (1024 * 1024)).toFixed(2)} MB`);

  const bundlePath = `${appId}/site_bundle.zip`;
  console.log('Enviando para Supabase Storage...');
  const upRes = await supabaseAdmin.storage.from('app-bundles').upload(bundlePath, zipBuf, {
    contentType: 'application/zip',
    upsert: true,
  });

  console.log('Upload Result:', upRes);
}

testUploadZip();
