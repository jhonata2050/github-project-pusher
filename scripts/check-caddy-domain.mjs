process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testDomain() {
  const url = 'https://botstarter512mb.dk1.eqsam.com';
  console.log(`Testando ${url}...`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log('Headers:');
    res.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));
    const body = await res.text();
    console.log('\nBody preview (primeiros 500 caracteres):');
    console.log(body.slice(0, 500));
  } catch (err) {
    console.error('Erro ao conectar:', err);
  }
}

testDomain();
