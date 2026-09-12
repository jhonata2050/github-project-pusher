import https from "https";
import http from "http";

const testUrl = async (host, path = "/") => {
  return new Promise((resolve) => {
    const opts = {
      host: "45.159.172.137",
      port: 443,
      path: path,
      method: "GET",
      rejectUnauthorized: false,
      headers: {
        Host: host,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      timeout: 10000,
    };
    const req = https.request(opts, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          bodySnippet: body.slice(0, 300).replace(/\s+/g, ' ')
        });
      });
    });
    req.on("error", (e) => resolve({ error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ error: "Timeout (10s)" });
    });
    req.end();
  });
};

async function testScreenshottedApp() {
  console.log("=== TESTANDO URLs EXATAS DO PRINT DO USUÁRIO ===");

  console.log("\n1. Página de Status: https://openstatus-9d845a79e685.dk1.eqsam.com");
  const resApp = await testUrl("openstatus-9d845a79e685.dk1.eqsam.com");
  console.log("Status Page Result:", resApp);

  console.log("\n2. Dashboard Admin: https://admin-openstatus-9d845a79e685.dk1.eqsam.com");
  const resDash = await testUrl("admin-openstatus-9d845a79e685.dk1.eqsam.com");
  console.log("Dashboard Result:", resDash);
}

testScreenshottedApp().catch(console.error);
