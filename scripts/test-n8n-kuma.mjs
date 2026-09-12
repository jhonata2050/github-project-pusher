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
  console.log("Testing n8n-a42de5c9405e.dk1.eqsam.com...");
  console.log("HTTP:", await testFetch("http://45.159.172.137", "n8n-a42de5c9405e.dk1.eqsam.com"));
  console.log("HTTPS:", await testFetch("https://45.159.172.137", "n8n-a42de5c9405e.dk1.eqsam.com"));

  console.log("\nTesting kuma-c35260bc8b7f.dk1.eqsam.com...");
  console.log("HTTP:", await testFetch("http://45.159.172.137", "kuma-c35260bc8b7f.dk1.eqsam.com"));
  console.log("HTTPS:", await testFetch("https://45.159.172.137", "kuma-c35260bc8b7f.dk1.eqsam.com"));
}

main().catch(console.error);
