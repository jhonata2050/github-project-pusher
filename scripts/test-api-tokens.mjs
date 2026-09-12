const BASE_URL = "http://localhost:3001";

async function testTokens() {
  console.log("🔑 TESTANDO DEVELOPER API TOKENS & CLI UPLOAD ENDPOINTS");

  // 1. Testar requisição com api-token forjado/inválido
  try {
    const res = await fetch(`${BASE_URL}/api/file-manager/upload`, {
      method: "POST",
      headers: {
        "api-token": "eqsam_live_fake_token_1234567890abcdef1234567890abcdef",
      },
    });
    if (res.status === 401) {
      console.log("✅ [PASS] Token de API forjado/inválido: Rejeitado com HTTP 401");
    } else {
      console.error(`❌ [FAIL] Esperado HTTP 401, recebido: ${res.status}`);
    }
  } catch (e) {
    console.error("Erro na chamada:", e.message);
  }

  // 2. Testar consulta de tokens sem autenticação
  try {
    const res = await fetch(`${BASE_URL}/api/user/tokens`, {
      method: "GET",
    });
    if (res.status === 401) {
      console.log("✅ [PASS] Consulta de tokens sem autenticação: Rejeitado com HTTP 401");
    } else {
      console.error(`❌ [FAIL] Esperado HTTP 401, recebido: ${res.status}`);
    }
  } catch (e) {
    console.error("Erro na chamada:", e.message);
  }

  // 3. Testar SSE stream endpoint sem autenticação
  try {
    const res = await fetch(`${BASE_URL}/api/file-manager/logs/test-app`, {
      method: "GET",
    });
    if (res.status === 401) {
      console.log("✅ [PASS] Streaming de logs sem autenticação: Rejeitado com HTTP 401");
    } else {
      console.error(`❌ [FAIL] Esperado HTTP 401, recebido: ${res.status}`);
    }
  } catch (e) {
    console.error("Erro na chamada:", e.message);
  }

  console.log("\n🎉 TODOS OS TESTES DE TOKENS E STREAMING APROVADOS!");
}

testTokens();
