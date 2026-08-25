process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testDomains() {
  const domains = [
    'https://9dltqgbguyyylrazdyxaz317.dk1.eqsam.com',
    'http://9dltqgbguyyylrazdyxaz317.dk1.eqsam.com',
    'https://botstarter512mb.dk1.eqsam.com',
    'http://botstarter512mb.dk1.eqsam.com',
  ];

  for (const d of domains) {
    try {
      const res = await fetch(d);
      const text = await res.text();
      console.log(`[HTTP ${res.status}] ${d} -> length: ${text.length}`);
      if (text.length > 0) {
        console.log(`Preview:`, text.slice(0, 200).replace(/\n/g, ' '));
      }
    } catch (e) {
      console.log(`[ERRO] ${d}:`, e.message);
    }
  }
}

testDomains();
