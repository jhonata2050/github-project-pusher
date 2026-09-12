import dns from "dns/promises";

async function testPublicDns() {
  console.log("=== TESTANDO RESOLUÇÃO DNS PÚBLICA (GOOGLE / CLOUDFLARE) ===");
  const resolver = new dns.Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);

  const hosts = [
    "openstatus-9d845a79e685.dk1.eqsam.com",
    "admin-openstatus-9d845a79e685.dk1.eqsam.com",
    "dk1.eqsam.com"
  ];

  for (const h of hosts) {
    try {
      const res = await resolver.resolve4(h);
      console.log(`✅ ${h} -> ${res.join(", ")}`);
    } catch (e) {
      console.error(`❌ ${h} -> ERRO DNS: ${e.code} (${e.message})`);
    }
  }
}

testPublicDns().catch(console.error);
