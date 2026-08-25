process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testAllSitePages() {
  const pages = [
    'https://botstarter512mb.dk1.eqsam.com/',
    'https://botstarter512mb.dk1.eqsam.com/vps.html',
    'https://botstarter512mb.dk1.eqsam.com/politica-de-privacidade.html',
    'https://botstarter512mb.dk1.eqsam.com/404.html',
    'https://botstarter512mb.dk1.eqsam.com/assets/css/elementor551e.css',
    'https://botstarter512mb.dk1.eqsam.com/assets/img/log-pzero.png',
  ];

  console.log('Testando rotas do site do cliente em produção:\n');
  for (const u of pages) {
    try {
      const res = await fetch(u);
      const text = await res.text();
      console.log(`[HTTP ${res.status}] ${u} -> Size: ${text.length} bytes`);
    } catch (e) {
      console.error(`[ERRO] ${u}:`, e.message);
    }
  }
}

testAllSitePages();
