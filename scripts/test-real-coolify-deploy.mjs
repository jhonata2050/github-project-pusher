process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testDeployCustomHtmlToCoolify() {
  const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';
  const uuid = '9dltqgbguyyylrazdyxaz317';
  
  const customHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Site Publicado via Painel Eqsam</title>
  <style>
    body { font-family: sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { background: #161616; padding: 40px; border-radius: 20px; border: 1px solid #282828; text-align: center; }
    h1 { color: #22c55e; }
  </style>
</head>
<body>
  <div class="box">
    <h1>🚀 Deploy Real Concluído no Caddy Server!</h1>
    <p>Este arquivo HTML foi injetado diretamente no servidor Coolify pelo painel do cliente.</p>
  </div>
</body>
</html>`;

  // Codificar em base64 para injetar no Dockerfile
  const htmlBase64 = Buffer.from(customHtml).toString('base64');
  
  const dockerfileContent = `FROM caddy:2-alpine
RUN mkdir -p /var/www/html
RUN echo "${htmlBase64}" | base64 -d > /var/www/html/index.html
EXPOSE 80
CMD ["caddy", "file-server", "--root", "/var/www/html", "--listen", ":80"]
`;

  console.log('Enviando Dockerfile personalizado para o Coolify...');
  const patchRes = await fetch(`https://dk1.eqsam.com/api/v1/applications/${uuid}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      build_pack: 'dockerfile',
      dockerfile: dockerfileContent,
      ports_exposes: '80'
    })
  });
  
  console.log('PATCH status:', patchRes.status);
  
  console.log('Disparando Deploy no Coolify...');
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

testDeployCustomHtmlToCoolify();
