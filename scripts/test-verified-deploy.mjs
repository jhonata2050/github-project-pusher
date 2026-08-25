process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const apiUrl = 'https://dk1.eqsam.com/api/v1';
const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';

async function testWorkingDeploy() {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const serversRes = await fetch(`${apiUrl}/servers`, { headers });
  const serverUuid = (await serversRes.json())[0]?.uuid;

  const projectsRes = await fetch(`${apiUrl}/projects`, { headers });
  const projectUuid = (await projectsRes.json())[0]?.uuid;

  console.log('Server:', serverUuid, 'Project:', projectUuid);

  // Deploy Next.js / Node.js standard starter
  const payload = {
    name: 'test-node-fastify',
    project_uuid: projectUuid,
    environment_name: 'production',
    server_uuid: serverUuid,
    build_pack: 'nixpacks',
    git_repository: 'https://github.com/fastify/fastify-example-twitter',
    git_branch: 'master',
    ports_exposes: '3000',
    limits_memory: '512m',
    limits_cpus: '1'
  };

  const createRes = await fetch(`${apiUrl}/applications/public`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const app = await createRes.json();
  console.log('App Created:', app);

  if (app?.uuid) {
    const depRes = await fetch(`${apiUrl}/deploy?uuid=${app.uuid}&force=false`, {
      method: 'POST',
      headers
    });
    const dep = await depRes.json();
    console.log('Deploy queued:', dep);

    const depUuid = dep.deployments?.[0]?.deployment_uuid;
    if (depUuid) {
      console.log('Polling deployment', depUuid);
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(`${apiUrl}/deployments/${depUuid}`, { headers });
        const st = await statusRes.json();
        console.log(`[Poll ${i+1}] Status:`, st.status);
        if (st.status === 'finished' || st.status === 'failed') {
          console.log('Final status:', st.status);
          break;
        }
      }
    }
  }
}

testWorkingDeploy();
