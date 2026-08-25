process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testFetch() {
  const res = await fetch('https://botstarter512mb.dk1.eqsam.com/');
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body length:', text.length);
  console.log('Body preview:', text.slice(0, 300));
}

testFetch();
