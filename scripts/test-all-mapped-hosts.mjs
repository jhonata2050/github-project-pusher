import https from "https";
import http from "http";

const testFetch = async (url, hostHeader) => {
  return new Promise((resolve) => {
    const opts = {
      rejectUnauthorized: false,
      headers: hostHeader ? { Host: hostHeader } : {},
      timeout: 8000,
    };
    const req = (url.startsWith("https") ? https : http).get(url, opts, (res) => {
      resolve(`Status: ${res.statusCode} | Location: ${res.headers.location || 'none'} | Content-Type: ${res.headers['content-type'] || 'none'}`);
    });
    req.on("error", (e) => resolve(`Erro: ${e.message}`));
    req.on("timeout", () => {
      req.destroy();
      resolve("Timeout (8s)");
    });
  });
};

async function main() {
  console.log("=== TESTANDO TODOS OS HOSTS MAPEADOS ===");
  const hosts = [
    "wordpress-9d845a79e685.dk1.eqsam.com",
    "wordpress-1faab31027e9.dk1.eqsam.com",
    "kuma-2a4782817f60.dk1.eqsam.com",
    "n8n-a42de5c9405e.dk1.eqsam.com",
    "app-b211efedd5fc.dk1.eqsam.com",
    "kuma-c35260bc8b7f.dk1.eqsam.com"
  ];

  for (const h of hosts) {
    console.log(`\nHost: ${h}`);
    console.log("  HTTP ->", await testFetch("http://45.159.172.137", h));
    console.log("  HTTPS ->", await testFetch("https://45.159.172.137", h));
  }
}

main().catch(console.error);
