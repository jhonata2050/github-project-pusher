import https from "https";
import http from "http";

const testFetch = async (url, hostHeader) => {
  return new Promise((resolve) => {
    const opts = {
      rejectUnauthorized: false,
      headers: hostHeader ? { Host: hostHeader } : {},
      timeout: 5000,
    };
    const req = (url.startsWith("https") ? https : http).get(url, opts, (res) => {
      resolve(`Status: ${res.statusCode} | Location: ${res.headers.location || 'none'} | Server: ${res.headers.server || 'none'}`);
    });
    req.on("error", (e) => resolve(`Erro: ${e.message}`));
    req.on("timeout", () => {
      req.destroy();
      resolve("Timeout (5s)");
    });
  });
};

async function main() {
  console.log("Testing openstatus-463829a7305d.dk1.eqsam.com...");
  console.log("HTTPS:", await testFetch("https://45.159.172.137", "openstatus-463829a7305d.dk1.eqsam.com"));

  console.log("\nTesting openstatus-9d845a79e685.dk1.eqsam.com...");
  console.log("HTTPS:", await testFetch("https://45.159.172.137", "openstatus-9d845a79e685.dk1.eqsam.com"));

  console.log("\nTesting wordpress-be0003d98aa7.dk1.eqsam.com...");
  console.log("HTTPS:", await testFetch("https://45.159.172.137", "wordpress-be0003d98aa7.dk1.eqsam.com"));
}

main().catch(console.error);
