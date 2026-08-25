process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testCaddyLocations() {
  const token = '3|lyejJabP4fJ46SuOIk9YXjj07NLBpH7m6xswyTlJac725c82';
  const coolifyUuid = '9dltqgbguyyylrazdyxaz317';
  
  const sobreHtml = `<!DOCTYPE html><html><body><h1>Página Sobre Nós Funcionando 100%!</h1></body></html>`;
  const b64 = Buffer.from(sobreHtml).toString('base64');
  
  // Custom Caddyfile configurando explicitamente /var/www/html e /usr/share/caddy
  const customCaddyfile = `:80 {
    root * /var/www/html
    file_server
    encode zstd gzip
    try_files {path} /index.html
}
`;
  const caddyfileB64 = Buffer.from(customCaddyfile).toString('base64');

  const cmd = [
    'mkdir -p /var/www/html /usr/share/caddy /srv',
    `echo "${caddyfileB64}" | base64 -d > /etc/caddy/Caddyfile`,
    `echo "${b64}" | base64 -d > /var/www/html/sobre.html`,
    `echo "${b64}" | base64 -d > /usr/share/caddy/sobre.html`,
    `echo "${b64}" | base64 -d > /srv/sobre.html`,
    'caddy reload --config /etc/caddy/Caddyfile || true'
  ].join(' && ');

  console.log('Enviando comando para Caddy...');
  const patchRes = await fetch(`https://dk1.eqsam.com/api/v1/applications/${coolifyUuid}`, {
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
  console.log('PATCH:', patchRes.status);

  const deployRes = await fetch(`https://dk1.eqsam.com/api/v1/deploy?uuid=${coolifyUuid}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  console.log('Deploy:', deployRes.status);

  console.log('Aguardando 12 segundos...');
  await new Promise(r => setTimeout(r, 12000));

  const resSobre = await fetch('https://botstarter512mb.dk1.eqsam.com/sobre.html');
  console.log('[sobre.html Status]:', resSobre.status);
  console.log('[sobre.html Content]:', await resSobre.text());
}

testCaddyLocations();
