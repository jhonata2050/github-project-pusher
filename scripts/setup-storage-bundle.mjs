import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
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
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

async function createBucketAndUpload() {
  console.log('Criando bucket "app-bundles" no Supabase...');
  const { data: createdBucket, error: bucketErr } = await supabaseAdmin.storage.createBucket('app-bundles', {
    public: true,
    fileSizeLimit: 524288000, // 500 MB
  });
  console.log('Bucket result:', createdBucket, bucketErr?.message || 'OK');

  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const storageDir = path.resolve('storage', 'apps', appId, 'public_html');

  console.log('Compactando diretório:', storageDir);
  const zip = new JSZip();

  async function addDir(dir, rel = '') {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      const entryRel = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        await addDir(full, entryRel);
      } else {
        const data = await fsPromises.readFile(full);
        zip.file(entryRel, data);
      }
    }
  }

  await addDir(storageDir);
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  console.log(`ZIP gerado com sucesso: ${(zipBuf.length / (1024 * 1024)).toFixed(2)} MB`);

  const bundlePath = `${appId}/bundle.zip`;
  console.log(`Fazendo upload do bundle para Supabase Storage (${bundlePath})...`);
  const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage.from('app-bundles').upload(bundlePath, zipBuf, {
    contentType: 'application/zip',
    upsert: true
  });
  console.log('Upload result:', uploadData, uploadErr?.message || 'OK');

  const { data: pubUrl } = supabaseAdmin.storage.from('app-bundles').getPublicUrl(bundlePath);
  console.log('URL Pública do Bundle:', pubUrl.publicUrl);

  return pubUrl.publicUrl;
}

createBucketAndUpload();
