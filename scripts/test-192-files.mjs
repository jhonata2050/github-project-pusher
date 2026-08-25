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

async function testLargeBatchSave() {
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  
  // Simular 192 arquivos
  const testFiles = [];
  for (let i = 1; i <= 192; i++) {
    testFiles.push({
      path: `pages/arquivo_${i}.html`,
      name: `arquivo_${i}.html`,
      type: 'file',
      size: '1.2 KB',
      content: `<!DOCTYPE html><html><body><h1>Arquivo ${i}</h1></body></html>`,
      updated_at: new Date().toISOString()
    });
  }

  console.log('Tentando salvar 192 arquivos no Supabase...');
  const { error } = await supabaseAdmin.from('system_settings').upsert({
    key: `app_files_${appId}`,
    value: testFiles,
    updated_at: new Date().toISOString()
  }, { onConflict: 'key' });

  console.log('Resultado do upsert de 192 arquivos:', error ? error.message : 'Sucesso!');

  // Verificar leitura
  const { data } = await supabaseAdmin.from('system_settings').select('value').eq('key', `app_files_${appId}`).maybeSingle();
  let val = data?.value;
  if (typeof val === 'string') val = JSON.parse(val);
  console.log('Total lido do banco:', Array.isArray(val) ? val.length : 'Erro');
}

testLargeBatchSave();
