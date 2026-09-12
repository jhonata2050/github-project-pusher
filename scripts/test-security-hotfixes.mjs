process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = 'http://localhost:3001';

async function runTest(name, fn) {
  try {
    const result = await fn();
    if (result.pass) {
      console.log(`✅ [PASS] ${name}: ${result.message}`);
      return true;
    } else {
      console.error(`❌ [FAIL] ${name}: ${result.message}`);
      return false;
    }
  } catch (e) {
    console.error(`💥 [ERROR] ${name}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('🔒 INICIANDO BATERIA DE TESTES DE SEGURANÇA (HOTFIXES FASE 1)\n');
  let passed = 0;
  let total = 0;

  // Test 1: Bundle sem autenticação (IDOR Prevention)
  total++;
  if (await runTest('Download de Bundle sem Autenticação', async () => {
    const res = await fetch(`${BASE_URL}/api/file-manager/bundle/test-app-id`);
    if (res.status === 401) {
      return { pass: true, message: `Rejeitado corretamente com HTTP ${res.status}` };
    }
    return { pass: false, message: `Esperado HTTP 401, recebido HTTP ${res.status}` };
  })) passed++;

  // Test 2: Upload com JWT forjado / assinatura falsa
  total++;
  if (await runTest('Upload com JWT forjado sem assinatura válida', async () => {
    // Forged JWT: header.payload.fakesig
    const fakePayload = Buffer.from(JSON.stringify({ sub: '00000000-0000-0000-0000-000000000001', exp: 9999999999 })).toString('base64url');
    const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${fakePayload}.invalidsignature123`;
    
    const formData = new FormData();
    formData.append('appId', 'test-app');
    formData.append('file', new Blob(['console.log("hacked")'], { type: 'text/plain' }), 'hack.js');

    const res = await fetch(`${BASE_URL}/api/file-manager/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fakeToken}`
      },
      body: formData
    });
    if (res.status === 401) {
      return { pass: true, message: `Rejeitado corretamente com HTTP ${res.status} (Validação Criptográfica OK)` };
    }
    return { pass: false, message: `Esperado HTTP 401, recebido HTTP ${res.status}` };
  })) passed++;

  // Test 3: Mercado Pago Webhook sem assinatura (Fail-Closed)
  total++;
  if (await runTest('Webhook Mercado Pago sem assinatura (Fail-Closed)', async () => {
    const res = await fetch(`${BASE_URL}/api/public/webhooks/mercadopago?id=fake_tx_123`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'payment.created', data: { id: 'fake_tx_123' } })
    });
    if (res.status === 401) {
      return { pass: true, message: `Rejeitado com HTTP ${res.status} por falta de assinatura/segredo` };
    }
    return { pass: false, message: `Esperado HTTP 401, recebido HTTP ${res.status}` };
  })) passed++;

  // Test 4: AbacatePay Webhook sem assinatura (Fail-Closed)
  total++;
  if (await runTest('Webhook AbacatePay sem assinatura (Fail-Closed)', async () => {
    const res = await fetch(`${BASE_URL}/api/public/webhooks/abacatepay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'billing.paid', data: { id: 'fake_ref', status: 'PAID' } })
    });
    if (res.status === 401) {
      return { pass: true, message: `Rejeitado com HTTP ${res.status} por falta de assinatura` };
    }
    return { pass: false, message: `Esperado HTTP 401, recebido HTTP ${res.status}` };
  })) passed++;

  // Test 5: Stripe Webhook sem assinatura (Fail-Closed)
  total++;
  if (await runTest('Webhook Stripe sem assinatura (Fail-Closed)', async () => {
    const res = await fetch(`${BASE_URL}/api/public/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'payment_intent.succeeded', data: { object: { id: 'fake' } } })
    });
    if (res.status === 401) {
      return { pass: true, message: `Rejeitado com HTTP ${res.status} por falta de assinatura` };
    }
    return { pass: false, message: `Esperado HTTP 401, recebido HTTP ${res.status}` };
  })) passed++;

  // Test 6: Cron de Manutenção sem token Bearer
  total++;
  if (await runTest('Cron de Manutenção sem Bearer Token (Fail-Closed)', async () => {
    const res = await fetch(`${BASE_URL}/api/public/cron/maintenance`);
    if (res.status === 401) {
      return { pass: true, message: `Rejeitado com HTTP ${res.status}` };
    }
    return { pass: false, message: `Esperado HTTP 401, recebido HTTP ${res.status}` };
  })) passed++;

  // Test 7: Ingestão de Métricas VPS para ID inexistente
  total++;
  if (await runTest('Ingestão de Métricas VPS para UUID inexistente', async () => {
    const res = await fetch(`${BASE_URL}/api/public/vps-metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vps_id: '00000000-0000-0000-0000-000000000999',
        cpu: 10,
        ram: 20,
        disk: 30
      })
    });
    if (res.status === 404) {
      return { pass: true, message: `Rejeitado com HTTP ${res.status} (VPS inexistente não aceita dados)` };
    }
    return { pass: false, message: `Esperado HTTP 404, recebido HTTP ${res.status}` };
  })) passed++;

  console.log(`\n========================================`);
  console.log(`RESULTADO FINAL: ${passed}/${total} TESTES APROVADOS (${Math.round((passed/total)*100)}%)`);
  console.log(`========================================\n`);

  if (passed === total) {
    console.log('🎉 TODOS OS HOTFIXES DE SEGURANÇA FORAM VALIDADOS COM SUCESSO!');
    process.exit(0);
  } else {
    console.error('⚠️ ALGUNS TESTES FALHARAM.');
    process.exit(1);
  }
}

main();
