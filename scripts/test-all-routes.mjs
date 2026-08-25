process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testAllRoutes() {
  const routes = [
    'https://botstarter512mb.dk1.eqsam.com/',
    'https://botstarter512mb.dk1.eqsam.com/edital-em-questoes.html',
    'https://botstarter512mb.dk1.eqsam.com/policia_militar-alagoas.html',
    'https://botstarter512mb.dk1.eqsam.com/assets/css/elementor551e.css',
    'https://botstarter512mb.dk1.eqsam.com/assets/img/log-pzero.png',
    'https://botstarter512mb.dk1.eqsam.com/minha-rota-spa-teste'
  ];

  console.log('--- Testando Todas as Rotas e Assets no Caddy ---');
  for (const url of routes) {
    try {
      const res = await fetch(url);
      console.log(`[${res.status} ${res.statusText}] Content-Type: ${res.headers.get('content-type')} -> ${url}`);
    } catch (e) {
      console.error(`[ERRO] ${url}:`, e.message);
    }
  }
}

testAllRoutes();
