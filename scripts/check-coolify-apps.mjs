process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkCoolifyApp() {
  const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';
  const res = await fetch('https://dk1.eqsam.com/api/v1/applications', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  const data = await res.json();
  console.log('Coolify applications on server:', data);
}

checkCoolifyApp();
