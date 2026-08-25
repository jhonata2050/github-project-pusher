process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testPostDeployment() {
  const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';
  const uuid = '9dltqgbguyyylrazdyxaz317';
  
  const customHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Site do Cliente — Caddy no Coolify</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #18181b; border: 1px solid #27272a; padding: 2.5rem; border-radius: 1.5rem; text-align: center; max-width: 520px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    h1 { color: #22c55e; margin-bottom: 0.75rem; font-size: 1.75rem; }
    p { color: #a1a1aa; line-height: 1.6; }
    .tag { display: inline-block; background: rgba(34,197,94,0.12); color: #4ade80; border: 1px solid rgba(34,197,94,0.25); padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="tag">● Site Publicado no Caddy Server</div>
    <h1>🚀 Deploy Real Concluído no Coolify!</h1>
    <p>Os arquivos do cliente agora são gravados e servidos diretamente pelo Caddy HTTP/3 no cluster dk1.eqsam.com.</p>
  </div>
</body>
</html>`;

  const htmlBase64 = Buffer.from(customHtml).toString('base64');
  
  // Comando executado dentro do container Caddy
  const cmd = `mkdir -p /usr/share/caddy /var/www/html && echo "${htmlBase64}" | base64 -d > /usr/share/caddy/index.html && cp /usr/share/caddy/index.html /var/www/html/index.html`;

  console.log('Atualizando post_deployment_command no Coolify...');
  const patchRes = await fetch(`https://dk1.eqsam.com/api/v1/applications/${uuid}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      post_deployment_command: cmd,
      static_image: 'caddy:2-alpine'
    })
  });
  console.log('PATCH status:', patchRes.status);
  
  console.log('Disparando deploy real no Coolify...');
  const deployRes = await fetch(`https://dk1.eqsam.com/api/v1/deploy?uuid=${uuid}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  const deployData = await deployRes.json();
  console.log('Deploy response:', deployData);
}

testPostDeployment();
