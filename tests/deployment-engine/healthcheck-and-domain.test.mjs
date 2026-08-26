import { HealthcheckManager } from "../../src/lib/deployment-engine/healthcheck.js";
import { DomainVerificationManager } from "../../src/lib/deployment-engine/domain-verifier.js";
import http from "http";

async function runHealthcheckAndDomainTests() {
  console.log("▶ [TEST]: Healthcheck Manager & Domain Verification");

  // Create mock HTTP server
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    } else if (req.url === "/bad-gateway") {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end("Bad Gateway");
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>OK</h1>");
    }
  });

  await new Promise((resolve) => server.listen(9876, "127.0.0.1", resolve));

  try {
    // 1. Test HTTP Healthcheck
    const healthRes = await HealthcheckManager.check("http://127.0.0.1:9876", {
      type: "http",
      path: "/health",
      port: 9876,
      timeoutSeconds: 3,
      retries: 2,
    });

    if (!healthRes.isHealthy || healthRes.statusCode !== 200) {
      throw new Error(`Expected HTTP healthcheck to pass, got ${JSON.stringify(healthRes)}`);
    }

    // 2. Test TCP Healthcheck
    const tcpRes = await HealthcheckManager.check("127.0.0.1", {
      type: "tcp",
      port: 9876,
      timeoutSeconds: 3,
      retries: 2,
    });

    if (!tcpRes.isHealthy) {
      throw new Error(`Expected TCP healthcheck to pass, got ${JSON.stringify(tcpRes)}`);
    }

    // 3. Test Domain Verification with 200 OK
    const domainPass = await DomainVerificationManager.verifyDomain("http://127.0.0.1:9876", [200], 3000);
    if (!domainPass.isValid) {
      throw new Error(`Expected domain verification to pass, got ${JSON.stringify(domainPass)}`);
    }

    // 4. Test Domain Verification with 502 rejection
    const domainFail = await DomainVerificationManager.verifyDomain("http://127.0.0.1:9876/bad-gateway", [200], 3000);
    if (domainFail.isValid || !domainFail.isProxyError) {
      throw new Error(`Expected 502 to be rejected as proxy error, got ${JSON.stringify(domainFail)}`);
    }

    console.log("  ✔ Healthcheck & Domain Verification: PASS");
  } finally {
    server.close();
  }
}

runHealthcheckAndDomainTests();
