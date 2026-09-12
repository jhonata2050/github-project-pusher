import dns from "dns/promises";
import https from "https";
import http from "http";

async function testExternal() {
  console.log("=== TESTE DE ACESSO EXTERNO (DO NAVEGADOR / MÁQUINA LOCAL) ===");
  
  const domains = [
    "dk1.eqsam.com",
    "kuma-2a4782817f60.dk1.eqsam.com",
    "app-b211efedd5fc.dk1.eqsam.com",
    "openstatus-463829a7305d.dk1.eqsam.com",
    "45.159.172.137"
  ];

  for (const d of domains) {
    console.log(`\n1. Resolvendo DNS para: ${d}...`);
    try {
      if (d !== "45.159.172.137") {
        const addresses = await dns.resolve4(d);
        console.log(`   IP(s) resolvido(s):`, addresses);
      } else {
        console.log(`   IP direto: ${d}`);
      }
    } catch (err) {
      console.error(`   ❌ FALHA NO DNS para ${d}:`, err.code, err.message);
    }
  }

  // Testar conexão direta ao IP 45.159.172.137 nas portas 80 e 443
  console.log("\n2. Testando conectividade TCP nas portas 80 e 443 do IP 45.159.172.137...");
  
  const testFetch = async (url, hostHeader) => {
    return new Promise((resolve) => {
      const opts = {
        rejectUnauthorized: false,
        headers: hostHeader ? { Host: hostHeader } : {},
        timeout: 5000,
      };
      const req = (url.startsWith("https") ? https : http).get(url, opts, (res) => {
        resolve(`Status: ${res.statusCode} | Headers: ${JSON.stringify(res.headers.location || res.headers.server || "")}`);
      });
      req.on("error", (e) => resolve(`Erro: ${e.message}`));
      req.on("timeout", () => {
        req.destroy();
        resolve("Timeout (5s)");
      });
    });
  };

  console.log("- HTTP direto no IP (http://45.159.172.137):", await testFetch("http://45.159.172.137"));
  console.log("- HTTPS direto no IP (https://45.159.172.137):", await testFetch("https://45.159.172.137"));
  console.log("- HTTP com Host kuma-2a4782817f60.dk1.eqsam.com:", await testFetch("http://45.159.172.137", "kuma-2a4782817f60.dk1.eqsam.com"));
  console.log("- HTTPS com Host kuma-2a4782817f60.dk1.eqsam.com:", await testFetch("https://45.159.172.137", "kuma-2a4782817f60.dk1.eqsam.com"));
  console.log("- HTTP com Host app-b211efedd5fc.dk1.eqsam.com:", await testFetch("http://45.159.172.137", "app-b211efedd5fc.dk1.eqsam.com"));
  console.log("- HTTPS com Host app-b211efedd5fc.dk1.eqsam.com:", await testFetch("https://45.159.172.137", "app-b211efedd5fc.dk1.eqsam.com"));
}

testExternal().catch(console.error);
