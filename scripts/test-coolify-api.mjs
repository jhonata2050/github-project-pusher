process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const apiUrl = 'https://dk1.eqsam.com/api/v1';
const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';

async function testCoolify() {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const endpoints = ['/version', '/servers', '/projects', '/applications'];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${apiUrl}${ep}`, { headers });
      console.log(`=== ${ep} (Status: ${res.status}) ===`);
      const body = await res.text();
      console.log(body.slice(0, 500));
    } catch (e) {
      console.error(`Error fetching ${ep}:`, e.message);
    }
  }
}

testCoolify();
