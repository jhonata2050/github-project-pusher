process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const apiUrl = 'https://dk1.eqsam.com/api/v1';
const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';

async function testCreateAndDeploy() {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // 1. Get real server and project
  const serversRes = await fetch(`${apiUrl}/servers`, { headers });
  const servers = await serversRes.json();
  const serverUuid = servers[0]?.uuid;

  const projectsRes = await fetch(`${apiUrl}/projects`, { headers });
  const projects = await projectsRes.json();
  const projectUuid = projects[0]?.uuid;

  console.log(`Server UUID: ${serverUuid}, Project UUID: ${projectUuid}`);

  // 2. Create Public Application
  const payload = {
    name: 'test-caddy-static',
    project_uuid: projectUuid,
    environment_name: 'production',
    server_uuid: serverUuid,
    build_pack: 'static',
    git_repository: 'https://github.com/coollabsio/coolify-examples',
    git_branch: 'static',
    ports_exposes: '80',
    limits_memory: '512m',
    limits_cpus: '1'
  };

  console.log('Sending payload to /applications/public...');
  const createRes = await fetch(`${apiUrl}/applications/public`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  console.log(`Create Status: ${createRes.status}`);
  const result = await createRes.json();
  console.log('Create Result:', JSON.stringify(result, null, 2));

  if (result?.uuid) {
    console.log(`Setting FQDN for UUID: ${result.uuid}...`);
    const updateRes = await fetch(`${apiUrl}/applications/${result.uuid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fqdn: 'https://test-caddy.dk1.eqsam.com' })
    });
    console.log(`Update FQDN Status: ${updateRes.status}`);

    console.log(`Triggering deploy for UUID: ${result.uuid}...`);
    const deployRes = await fetch(`${apiUrl}/deploy?uuid=${result.uuid}&force=false`, {
      method: 'POST',
      headers
    });
    console.log(`Deploy Status: ${deployRes.status}`);
    const deployResult = await deployRes.json();
    console.log('Deploy Result:', JSON.stringify(deployResult, null, 2));
  }
}

testCreateAndDeploy();
