import JSZip from 'jszip';
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

async function testFull192ServerZip() {
  console.log('--- Teste de Upload de Pacote ZIP de 192 Arquivos no Servidor ---');
  
  // 1. Gerar pacote ZIP de 192 arquivos
  const zip = new JSZip();
  zip.file('meu-site/index.html', `<!DOCTYPE html><html><body><h1>Site com 192 Arquivos no Caddy!</h1></body></html>`);
  zip.file('meu-site/Caddyfile', `:80 {\n\troot * /var/www/html\n\tfile_server\n\tencode zstd gzip\n\ttry_files {path} /index.html\n}`);
  zip.file('meu-site/styles.css', `body { font-family: sans-serif; background: #18181b; color: white; }`);
  
  for (let i = 1; i <= 189; i++) {
    zip.file(`meu-site/paginas/pagina_${i}.html`, `<!DOCTYPE html><html><body><h1>Página ${i}</h1></body></html>`);
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  console.log('Tamanho do ZIP compactado:', (zipBuffer.length / 1024).toFixed(1), 'KB');

  const b64 = zipBuffer.toString('base64');

  // 2. Executar extração do servidor
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const serverZip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));

  const rawEntries = Object.keys(serverZip.files).filter(
    (name) => !serverZip.files[name].dir && !name.startsWith('__MACOSX/') && !name.includes('.DS_Store')
  );

  const firstSlashIndex = rawEntries[0].indexOf('/');
  let commonPrefix = '';
  if (firstSlashIndex > 0) {
    const potentialPrefix = rawEntries[0].substring(0, firstSlashIndex + 1);
    if (rawEntries.every((name) => name.startsWith(potentialPrefix))) {
      commonPrefix = potentialPrefix;
    }
  }

  const updatedFiles = [];
  for (const filename of rawEntries) {
    const entry = serverZip.files[filename];
    const cleanPath = commonPrefix ? filename.substring(commonPrefix.length) : filename;
    if (!cleanPath) continue;

    const content = await entry.async('string');
    updatedFiles.push({
      path: cleanPath,
      name: cleanPath.split('/').pop(),
      type: 'file',
      size: '1 KB',
      content,
      updated_at: new Date().toISOString()
    });
  }

  console.log('Total de arquivos extraídos pelo servidor:', updatedFiles.length);

  // 3. Salvar no Supabase
  const { error } = await supabaseAdmin.from('system_settings').upsert({
    key: `app_files_${appId}`,
    value: updatedFiles,
    updated_at: new Date().toISOString()
  }, { onConflict: 'key' });

  console.log('Salvo no Supabase com sucesso:', error ? error.message : 'OK');

  // 4. Testar leitura de arquivos no banco
  const { data } = await supabaseAdmin.from('system_settings').select('value').eq('key', `app_files_${appId}`).maybeSingle();
  let files = data?.value;
  if (typeof files === 'string') files = JSON.parse(files);
  console.log('Total lido do banco:', Array.isArray(files) ? files.length : 'Erro');
}

testFull192ServerZip();
