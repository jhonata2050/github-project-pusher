import { describe, it, expect } from "vitest";
import * as swarmCluster from "../../src/lib/swarm-cluster.server";
import * as finance from "../../src/lib/finance.server";
import * as cloudApps from "../../src/lib/cloud-apps.server";
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

  it("cloud-apps.server fachada deve reexportar todas as funções de Cloud PaaS, ciclo de vida e gerenciamento", () => {
    expect(typeof cloudApps.getClusterServers).toBe("function");
    expect(typeof cloudApps.saveClusterServers).toBe("function");
    expect(typeof cloudApps.getApplicationsStore).toBe("function");
    expect(typeof cloudApps.saveApplicationsStore).toBe("function");
    expect(typeof cloudApps.getActiveClusterServer).toBe("function");
    expect(typeof cloudApps.provisionCloudApplication).toBe("function");
    expect(typeof cloudApps.getCloudDeploymentStatus).toBe("function");
    expect(typeof cloudApps.executeCloudAppAction).toBe("function");
    expect(typeof cloudApps.startCloudApplication).toBe("function");
    expect(typeof cloudApps.stopCloudApplication).toBe("function");
    expect(typeof cloudApps.resetCloudApplication).toBe("function");
    expect(typeof cloudApps.getCloudApplicationDetails).toBe("function");
    expect(typeof cloudApps.getCloudApplicationLogs).toBe("function");
    expect(typeof cloudApps.getCloudApplicationFiles).toBe("function");
    expect(typeof cloudApps.saveCloudApplicationFile).toBe("function");
    expect(typeof cloudApps.deleteCloudApplicationFile).toBe("function");
    expect(typeof cloudApps.getCloudApplicationEnvs).toBe("function");
    expect(typeof cloudApps.saveCloudApplicationEnvs).toBe("function");
    expect(typeof cloudApps.updateCloudApplicationDomain).toBe("function");
    expect(typeof cloudApps.resetCloudApplicationDomain).toBe("function");
    expect(typeof cloudApps.verifyApplicationDomainDns).toBe("function");
    expect(typeof cloudApps.applyTemplateToApplication).toBe("function");
    expect(typeof cloudApps.deployCloudApplicationFromGit).toBe("function");
    expect(typeof cloudApps.getMyApplications).toBe("function");
    expect(typeof cloudApps.getAdminApplicationsList).toBe("function");
    expect(typeof cloudApps.updateCloudApplicationName).toBe("function");
    expect(cloudApps.activeDeployments).toBeInstanceOf(Map);
    expect(cloudApps.appDiskUsageCache).toBeInstanceOf(Map);
  });

  it("support.functions fachada deve reexportar todas as 27 server functions de Suporte, DA, Produtos e Serviços", async () => {
    const support = await import("../../src/lib/support.functions");
    // System settings
    expect(typeof support.testWhatsApp).toBe("function");
    expect(typeof support.getSystemSettings).toBe("function");
    expect(typeof support.updateSystemSettings).toBe("function");
    // Tickets
    expect(typeof support.getTickets).toBe("function");
    expect(typeof support.getTicketDetails).toBe("function");
    expect(typeof support.createTicket).toBe("function");
    expect(typeof support.replyTicket).toBe("function");
    expect(typeof support.updateTicketStatus).toBe("function");
    // Servers & DirectAdmin
    expect(typeof support.getServers).toBe("function");
    expect(typeof support.createServerDA).toBe("function");
    expect(typeof support.updateServerDA).toBe("function");
    expect(typeof support.deleteServerDA).toBe("function");
    expect(typeof support.testDAConnection).toBe("function");
    expect(typeof support.getDAPackagesList).toBe("function");
    expect(typeof support.getDACapabilitiesList).toBe("function");
    expect(typeof support.getDASSOUrl).toBe("function");
    expect(typeof support.getServiceServerDetails).toBe("function");
    expect(typeof support.hostingAction).toBe("function");
    // Products & Groups
    expect(typeof support.getAllProducts).toBe("function");
    expect(typeof support.getProductGroups).toBe("function");
    expect(typeof support.createProductGroup).toBe("function");
    expect(typeof support.updateProductGroup).toBe("function");
    expect(typeof support.deleteProductGroup).toBe("function");
    expect(typeof support.createProduct).toBe("function");
    expect(typeof support.updateProduct).toBe("function");
    // Services
    expect(typeof support.updateServiceDetails).toBe("function");
    expect(typeof support.adminCreateClientService).toBe("function");
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
