import https from "https";

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

async function checkOverview() {
  console.log("=== SEGUINDO REDIRECT DO DASHBOARD /overview ===");
  const res = await testUrl("admin-openstatus-9d845a79e685.dk1.eqsam.com", "/overview");
  console.log("Result:", res);

  if (res.headers?.location) {
    console.log(`\nSeguindo para: ${res.headers.location}`);
    const res2 = await testUrl("admin-openstatus-9d845a79e685.dk1.eqsam.com", res.headers.location);
    console.log("Result 2:", res2);
  }
}

checkOverview().catch(console.error);
