import { DeploymentDiagnosticsService } from "../../src/lib/deployment-engine/diagnostics.js";

function runDiagnosticsTests() {
  console.log("▶ [TEST]: Deployment Diagnostics Translation & Action Mapping");

  // 1. Diagnose ECONNREFUSED
  const connRefused = DeploymentDiagnosticsService.diagnose("connect ECONNREFUSED 127.0.0.1:5432 at TCPConnectWrap");
  if (connRefused.code !== "ERR_CONN_REFUSED" || !connRefused.description.includes("PostgreSQL")) {
    throw new Error(`Expected ERR_CONN_REFUSED with PostgreSQL mention, got ${JSON.stringify(connRefused)}`);
  }

  // 2. Diagnose 502 Bad Gateway
  const badGateway = DeploymentDiagnosticsService.diagnose("HTTP 502 Bad Gateway from reverse proxy");
  if (badGateway.code !== "ERR_BAD_GATEWAY_502" || !badGateway.action) {
    throw new Error(`Expected ERR_BAD_GATEWAY_502, got ${JSON.stringify(badGateway)}`);
  }

  // 3. Diagnose MODULE_NOT_FOUND
  const modNotFound = DeploymentDiagnosticsService.diagnose("Error: Cannot find module 'express' from /app/index.js");
  if (modNotFound.code !== "ERR_MODULE_NOT_FOUND" || modNotFound.action.type !== "view_logs") {
    throw new Error(`Expected ERR_MODULE_NOT_FOUND, got ${JSON.stringify(modNotFound)}`);
  }

  console.log("  ✔ Deployment Diagnostics: PASS");
}

runDiagnosticsTests();
