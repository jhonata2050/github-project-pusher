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
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function syncEssentialSiteFiles() {
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const clientRoot = path.resolve('storage', 'apps', appId, 'public_html');

  const zip = new JSZip();
  let count = 0;

  async function addFolder(folderName) {
    const d = path.join(clientRoot, folderName);
    if (!fs.existsSync(d)) return;
    const entries = await fsPromises.readdir(d, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      const rel = `${folderName}/${ent.name}`;
      if (ent.isDirectory()) {
        const subEntries = await fsPromises.readdir(full);
        for (const s of subEntries) {
          const sFull = path.join(full, s);
          const sRel = `${rel}/${s}`;
          zip.file(sRel.replace(/\\/g, '/'), await fsPromises.readFile(sFull));
          count++;
        }
      } else {
        zip.file(rel.replace(/\\/g, '/'), await fsPromises.readFile(full));
        count++;
      }
    }
  }

  // Adicionar todos os arquivos da raiz
  const rootEntries = await fsPromises.readdir(clientRoot, { withFileTypes: true });
  for (const ent of rootEntries) {
    if (!ent.isDirectory() && !ent.name.endsWith('.zip') && !ent.name.endsWith('.tar') && !ent.name.endsWith('.gz')) {
      const full = path.join(clientRoot, ent.name);
      zip.file(ent.name, await fsPromises.readFile(full));
      count++;
    }
  }

  // Adicionar pasta assets e devtools
  await addFolder('assets');
  await addFolder('devtools');

  console.log(`Compactando ${count} arquivos essenciais do site...`);
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  console.log(`Tamanho do pacote essencial: ${(zipBuf.length / (1024 * 1024)).toFixed(2)} MB`);

  const bundlePath = `${appId}/site_bundle.zip`;
  const upRes = await supabaseAdmin.storage.from('app-bundles').upload(bundlePath, zipBuf, {
    contentType: 'application/zip',
    upsert: true,
  });
  console.log('Upload para app-bundles:', upRes.error ? upRes.error.message : '✅ Sucesso (200 OK)');

  // Redeploy
  const { data: serverData } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'coolify_servers_registry').maybeSingle();
  let servers = serverData?.value;
  if (typeof servers === 'string') servers = JSON.parse(servers);
  const server = servers?.[0];

  let baseUrl = server.apiUrl.trim().replace(/\/+$/, '');
  if (!baseUrl.endsWith('/api/v1')) baseUrl += '/api/v1';

  const coolifyAppUuid = '9dltqgbguyyylrazdyxaz317';
  console.log('Disparando deploy forçado...');
  const deployRes = await fetch(`${baseUrl}/deploy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${server.apiToken.trim()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ uuid: coolifyAppUuid, force: true }),
  });
  console.log('Deploy status:', deployRes.status);
}

syncEssentialSiteFiles();
