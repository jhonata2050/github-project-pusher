import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

async function testSave() {
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const newFiles = [
    { path: 'index.html', content: '<h1>Meu Site Publicado com Sucesso!</h1>' },
    { path: 'sobre.html', content: '<h1>Sobre a Empresa</h1>' },
    { path: 'css/style.css', content: 'body { background: black; color: white; }' }
  ];

  const { data: existing } = await supabase.from('system_settings').select('value').eq('key', 'app_files_' + appId).maybeSingle();
  let files = existing?.value || [];

  for (const item of newFiles) {
    const cleanPath = item.path.replace(/^\/+/, '');
    const idx = files.findIndex(f => f.path === cleanPath);
    if (idx >= 0) {
      files[idx] = { ...files[idx], content: item.content, updated_at: new Date().toISOString() };
    } else {
      files.push({
        path: cleanPath,
        name: cleanPath.split('/').pop(),
        type: 'file',
        size: '1 KB',
        content: item.content,
        updated_at: new Date().toISOString()
      });
    }
  }

  const { error } = await supabase.from('system_settings').upsert({
    key: 'app_files_' + appId,
    value: files,
    updated_at: new Date().toISOString()
  }, { onConflict: 'key' });

  console.log('Upsert result error:', error);
  console.log('Total files now:', files.length);
}

testSave();
