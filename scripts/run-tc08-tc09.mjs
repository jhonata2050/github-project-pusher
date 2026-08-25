import https from 'https';
import tls from 'tls';

async function runTC08andTC09() {
  console.log('--- TC-08 & TC-09: Teste de Resiliência e Certificado SSL ---');
  
  // 1. Inspecionar Certificado SSL TLS
  const hostname = 'botstarter512mb.dk1.eqsam.com';
  console.log(`[SSL Check] Conectando ao host ${hostname}:443 para validação de TLS...`);

  const socket = tls.connect(443, hostname, { servername: hostname, rejectUnauthorized: false }, () => {
    const cert = socket.getPeerCertificate(true);
    console.log('[SSL Check] Sujeito do Certificado (CN):', cert.subject?.CN);
    console.log('[SSL Check] Emissor do Certificado (O):', cert.issuer?.O || cert.issuer?.CN);
    console.log('[SSL Check] Válido a partir de:', cert.valid_from);
    console.log('[SSL Check] Válido até:', cert.valid_to);
    console.log('[SSL Check] Protocolo TLS Negociado:', socket.getProtocol());
    console.log('[SSL Check] Criptografia (Cipher):', socket.getCipher()?.name);
    socket.end();
  });

  socket.on('error', (err) => {
    console.error('[SSL Check] Erro na verificação SSL:', err);
  });
}

runTC08andTC09();
