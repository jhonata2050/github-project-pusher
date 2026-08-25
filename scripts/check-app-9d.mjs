process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkApp() {
  const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';
  const res = await fetch('https://dk1.eqsam.com/api/v1/applications/9dltqgbguyyylrazdyxaz317', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  const data = await res.json();
  console.log('Application 9dltqgbguyyylrazdyxaz317 details:');
  console.log(JSON.stringify(data, null, 2));
}

checkApp();
