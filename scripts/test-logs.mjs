process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const apiUrl = 'https://dk1.eqsam.com/api/v1';
const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';

async function testLogs() {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const appUuid = 'bzlxpybof8znhacmhi2bjsst';
  const depUuid = 'ex0lmegppd5z8lyk1thbtawe';

  console.log('=== GET /applications/' + appUuid + ' ===');
  const appRes = await fetch(`${apiUrl}/applications/${appUuid}`, { headers });
  console.log('App Details:', await appRes.text());

  console.log('=== GET /deployments/' + depUuid + ' ===');
  const depRes = await fetch(`${apiUrl}/deployments/${depUuid}`, { headers });
  console.log('Deployment status:', await depRes.text());
}

testLogs();
