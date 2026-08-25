import fs from 'fs';

// Carregar .env antes de qualquer import do projeto
const envText = fs.readFileSync('.env', 'utf8');
envText.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testLiveSyncAndCheck() {
  const { syncAppFilesToCoolify } = await import('../src/lib/file-manager/server.ts');
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';

  console.log('Disparando sincronização com Caddy...');
  const resSync = await syncAppFilesToCoolify(appId);
  console.log('Resultado da sincronização:', resSync);

  // Aguardar 5 segundos para o Coolify aplicar e o Caddy recarregar
  await new Promise(r => setTimeout(r, 6000));

  const urls = [
    'https://botstarter512mb.dk1.eqsam.com/',
    'https://botstarter512mb.dk1.eqsam.com/vps.html',
    'https://botstarter512mb.dk1.eqsam.com/politica-de-privacidade.html',
    'https://botstarter512mb.dk1.eqsam.com/404.html',
  ];

  for (const u of urls) {
    const res = await fetch(u);
    const text = await res.text();
    console.log(`[HTTP ${res.status}] ${u} -> Length: ${text.length} bytes, Preview: ${text.slice(0, 80).replace(/\n/g, ' ')}`);
  }
}

testLiveSyncAndCheck();
