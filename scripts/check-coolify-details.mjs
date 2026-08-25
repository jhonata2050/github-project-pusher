process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkCoolifyAppDetails() {
  const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';
  
  // Buscar lista de apps
  const res = await fetch('https://dk1.eqsam.com/api/v1/applications', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  const apps = await res.json();
  console.log('Total apps on Coolify:', apps.length);
  
  for (const app of apps) {
    console.log(`- UUID: ${app.uuid} | Name: ${app.name} | FQDN: ${app.fqdn} | BuildPack: ${app.build_pack} | Status: ${app.status}`);
  }
}

checkCoolifyAppDetails();
