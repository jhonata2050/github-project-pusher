process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkAllowedFields() {
  const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';
  const uuid = '9dltqgbguyyylrazdyxaz317';
  
  const testPayloads = [
    { name: 'bot-starter-512mb-' },
    { post_deployment_command: 'echo "hello"' },
    { custom_docker_run_options: '--name myapp' },
    { static_image: 'caddy:2-alpine' },
    { docker_compose_raw: 'services:\n  web:\n    image: caddy:2-alpine' }
  ];

  for (const p of testPayloads) {
    const res = await fetch(`https://dk1.eqsam.com/api/v1/applications/${uuid}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(p)
    });
    console.log(`Field ${Object.keys(p)[0]} -> Status: ${res.status}`);
    if (res.status !== 200) {
      console.log('Error:', await res.text());
    }
  }
}

checkAllowedFields();
