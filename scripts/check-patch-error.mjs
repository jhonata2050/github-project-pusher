process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkPatchError() {
  const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';
  const uuid = '9dltqgbguyyylrazdyxaz317';
  
  const patchRes = await fetch(`https://dk1.eqsam.com/api/v1/applications/${uuid}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      build_pack: 'dockerfile',
      dockerfile: 'FROM caddy:2-alpine'
    })
  });
  
  console.log('Status:', patchRes.status);
  const text = await patchRes.text();
  console.log('Error details:', text);
}

checkPatchError();
