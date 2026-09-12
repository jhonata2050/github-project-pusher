import { describe, it, expect } from "vitest";
import * as swarmCluster from "../../src/lib/swarm-cluster.server";
import * as finance from "../../src/lib/finance.server";
import { generateCaddyfileForRuntime } from "../../src/lib/swarm/swarm-routing.server";

describe("Lei da Preservação de Fachadas (Facade Integrity Tests)", () => {
  it("swarm-cluster.server fachada deve reexportar todas as 17 funções e tipos essenciais do Docker Swarm", () => {
    expect(typeof swarmCluster.execSshCommand).toBe("function");
    expect(typeof swarmCluster.getSshConnection).toBe("function");
    expect(typeof swarmCluster.syncSwarmDomainRouting).toBe("function");
    expect(typeof swarmCluster.generateCaddyfileForRuntime).toBe("function");
    expect(typeof swarmCluster.deployTemplateStackToSwarm).toBe("function");
    expect(typeof swarmCluster.manageSwarmServiceLifecycle).toBe("function");
    expect(typeof swarmCluster.removeSwarmServiceAndStack).toBe("function");
    expect(typeof swarmCluster.syncFilesToSwarmContainer).toBe("function");
    expect(typeof swarmCluster.getSwarmServiceLogs).toBe("function");
    expect(typeof swarmCluster.pullRealFilesFromSwarm).toBe("function");
    expect(typeof swarmCluster.writeRemoteSwarmFile).toBe("function");
    expect(typeof swarmCluster.deleteRemoteSwarmItems).toBe("function");
    expect(typeof swarmCluster.createRemoteSwarmDirectory).toBe("function");
    expect(typeof swarmCluster.getSwarmClusterDockerStats).toBe("function");
    expect(typeof swarmCluster.syncSwarmServiceLimits).toBe("function");
  });

  it("finance.server fachada deve reexportar todas as funções financeiras e de ciclo de vida", () => {
    expect(typeof finance.placeOrder).toBe("function");
    expect(typeof finance.fetchInvoiceDetails).toBe("function");
    expect(typeof finance.processProvisioning).toBe("function");
    expect(typeof finance.handlePaymentSuccess).toBe("function");
    expect(typeof finance.adminUpdateInvoiceImplementation).toBe("function");
    expect(typeof finance.adminCreateManualInvoiceImplementation).toBe("function");
  });
});

describe("Motor Caddy & Hardening de Segurança OWASP", () => {
  it("deve incluir cabeçalhos anti-fingerprinting e bloqueio de arquivos sensíveis", () => {
    const caddyfile = generateCaddyfileForRuntime("STATIC");
    expect(caddyfile).toContain("-Server");
    expect(caddyfile).toContain("-X-Powered-By");
    expect(caddyfile).toContain("X-Content-Type-Options \"nosniff\"");
    expect(caddyfile).toContain("@sensitiveFiles");
    expect(caddyfile).toContain(".env*");
    expect(caddyfile).toContain("not path /.well-known/*");
  });

  it("deve gerar regra try_files exclusiva para Single Page Applications (STATIC_SPA)", () => {
    const spaCaddy = generateCaddyfileForRuntime("STATIC_SPA");
    expect(spaCaddy).toContain("try_files {path} {path}/ /index.html");

    const staticCaddy = generateCaddyfileForRuntime("STATIC");
    expect(staticCaddy).toContain("try_files {path} {path}/index.html {path}/ =404");
  });

  it("deve configurar proxy reverso Caddy com flush_interval e headers corretos", () => {
    const proxyCaddy = generateCaddyfileForRuntime("NODE", {
      hasAppService: true,
      proxyTarget: "app:3000",
    });
    expect(proxyCaddy).toContain("reverse_proxy app:3000");
    expect(proxyCaddy).toContain("flush_interval -1");
    expect(proxyCaddy).toContain("header_up Host {host}");
  });
});
