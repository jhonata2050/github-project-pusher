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

  it("directadmin.server fachada deve reexportar todas as funções, utilitários e gerador de credenciais do DirectAdmin", async () => {
    const da = await import("../../src/lib/directadmin.server");
    expect(typeof da.callDA).toBe("function");
    expect(typeof da.getDAPackages).toBe("function");
    expect(typeof da.getDACapabilities).toBe("function");
    expect(typeof da.testDAConnectionDetails).toBe("function");
    expect(typeof da.createDAAccount).toBe("function");
    expect(typeof da.suspendDAAccount).toBe("function");
    expect(typeof da.unsuspendDAAccount).toBe("function");
    expect(typeof da.deleteDAAccount).toBe("function");
    expect(typeof da.checkDAUserExists).toBe("function");
    expect(typeof da.getDASession).toBe("function");
    expect(typeof da.modifyDAUserPackage).toBe("function");
    expect(typeof da.generateStrongPassword).toBe("function");
    expect(typeof da.normalizePackageList).toBe("function");
    expect(typeof da.isValidDirectAdminLoginUrl).toBe("function");
    expect(typeof da.parseDirectAdminLoginUrl).toBe("function");

    // Validação do gerador de senhas seguras
    const pwd1 = da.generateStrongPassword(24);
    const pwd2 = da.generateStrongPassword(32);
    expect(pwd1.length).toBe(24);
    expect(pwd2.length).toBe(32);
    expect(pwd1).not.toBe(pwd2);
  });

  it("swarm-deployer.server e submódulos de templates devem exportar funções de orquestração", async () => {
    const deployer = await import("../../src/lib/swarm/swarm-deployer.server");
    expect(typeof deployer.deployTemplateStackToSwarm).toBe("function");

    const composeBuilder = await import("../../src/lib/swarm/templates/compose-builder");
    expect(typeof composeBuilder.buildTemplateComposeYaml).toBe("function");

    const bootstrapFiles = await import("../../src/lib/swarm/templates/bootstrap-files");
    expect(typeof bootstrapFiles.writeStarterFilesIfEmpty).toBe("function");

    const postDeploy = await import("../../src/lib/swarm/templates/post-deploy");
    expect(typeof postDeploy.runPostDeployHooks).toBe("function");
  });

  it("payments.server fachada deve reexportar todas as funções de sessão, URLs canônicas e adaptadores de gateway", async () => {
    const payments = await import("../../src/lib/payments.server");
    expect(typeof payments.getCanonicalPublicUrl).toBe("function");
    expect(typeof payments.createPaymentSession).toBe("function");
    expect(typeof payments.createPaymentSessionWithFallback).toBe("function");
    expect(typeof payments.recordTransaction).toBe("function");
    expect(typeof payments.onlyDigits).toBe("function");

    // Adaptadores individuais
    expect(typeof payments.createAbacatePaySession).toBe("function");
    expect(typeof payments.createStripeSession).toBe("function");
    expect(typeof payments.createMercadoPagoSession).toBe("function");
    expect(typeof payments.createWooviSession).toBe("function");
    expect(typeof payments.createPagHiperSession).toBe("function");
    expect(typeof payments.createCajuPaySession).toBe("function");
    expect(typeof payments.createMisticPaySession).toBe("function");

    // Validações utilitárias
    expect(payments.onlyDigits("123.456.789-00")).toBe("12345678900");
    expect(payments.onlyDigits("+55 (11) 99999-8888")).toBe("5511999998888");

    const url = payments.getCanonicalPublicUrl();
    expect(url.endsWith("/")).toBe(false);
    expect(url).not.toContain("localhost");
  });

  it("useAppManagement deve exportar detectPendingRequiredEnvs e detectar variáveis de exemplo", async () => {
    const { detectPendingRequiredEnvs } = await import("../../src/components/apps/hooks/useAppManagement");
    expect(typeof detectPendingRequiredEnvs).toBe("function");

    const pending = detectPendingRequiredEnvs([
      { key: "DB_PASSWORD", value: "re_insira_sua_senha" },
      { key: "API_KEY", value: "" },
      { key: "PORT", value: "3000" },
      { key: "NODE_ENV", value: "production" },
    ]);
    expect(pending.length).toBe(2);
    expect(pending.map(p => p.key)).toEqual(["DB_PASSWORD", "API_KEY"]);
  });

  it("AppOverviewTab e subcomponentes de overview devem ser exportados corretamente", async () => {
    const { AppOverviewTab } = await import("../../src/components/apps/tabs/AppOverviewTab");
    expect(typeof AppOverviewTab).toBe("function");

    const overview = await import("../../src/components/apps/overview");
    expect(typeof overview.AppPendingDeployBanner).toBe("function");
    expect(typeof overview.AppPendingEnvsAlert).toBe("function");
    expect(typeof overview.AppMetricsCards).toBe("function");
    expect(typeof overview.AppConnectionEndpointsCard).toBe("function");
    expect(typeof overview.AppInfrastructureInfoCard).toBe("function");
  });

  it("UptimeMonitoringSection e submódulos de uptime devem calcular métricas e eventos sem regressão", async () => {
    const {
      UptimeMonitoringSection,
      buildRealResourceTimeline,
    } = await import("../../src/components/apps/UptimeMonitoringSection");
    expect(typeof UptimeMonitoringSection).toBe("function");
    expect(typeof buildRealResourceTimeline).toBe("function");

    const uptime = await import("../../src/components/apps/uptime");
    expect(typeof uptime.buildRealResourceTimeline).toBe("function");
    expect(typeof uptime.computeResourceSummary).toBe("function");
    expect(typeof uptime.extractContainerEvents).toBe("function");
    expect(typeof uptime.UptimeChart).toBe("function");
    expect(typeof uptime.UptimeEventList).toBe("function");

    // Teste de buildRealResourceTimeline para período de 1h
    const points1h = uptime.buildRealResourceTimeline(
      "1h",
      15, // currentCpu
      1024, // totalRam
      256, // currentRamMb
      10, // totalDisk
      2.5, // currentDiskGb
      "2.5 GB", // usedDiskFormatted
      true, // isRunning
      3600, // uptimeSeconds (1h)
      new Date(Date.now() - 3600 * 1000).toISOString(),
      [
        {
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          cpuPercent: 45,
          ramMb: 300,
          ramPercent: 29,
          diskGb: 2.5,
          diskPercent: 25,
          isOnline: true,
        },
      ]
    );

    expect(points1h.length).toBe(30);
    const lastPoint = points1h[points1h.length - 1];
    expect(lastPoint.isOnline).toBe(true);
    expect(lastPoint.cpuPercent).toBe(15);
    expect(lastPoint.ramMb).toBe(256);

    // Teste de computeResourceSummary
    const summary = uptime.computeResourceSummary(
      points1h,
      2.5,
      1024,
      10,
      true,
      25,
      [{ timestamp: new Date().toISOString(), cpuPercent: 88, ramMb: 300, ramPercent: 29, diskGb: 2.5, diskPercent: 25 }]
    );
    expect(summary.maxCpu).toBeGreaterThanOrEqual(88);
    expect(summary.avgCpu).toBeGreaterThan(0);
    expect(summary.diskGb).toBe(2.5);

    // Teste de extractContainerEvents
    const events = uptime.extractContainerEvents({
      createdAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      isRunning: true,
      uptimeSeconds: 3600,
      uptimeFormatted: "1 hora",
      telemetryHistory: [
        {
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          cpuPercent: 95,
          ramMb: 850,
          ramPercent: 83,
          diskGb: 2.5,
          diskBytes: 250 * 1024 * 1024,
          diskPercent: 25,
          isOnline: true,
        },
      ],
    });

    expect(events.length).toBeGreaterThanOrEqual(3);
    const eventTitles = events.map(e => e.title);
    expect(eventTitles.some(t => t.includes("Provisionamento"))).toBe(true);
    expect(eventTitles.some(t => t.includes("Inicialização"))).toBe(true);
    expect(eventTitles.some(t => t.includes("Pico de Processamento"))).toBe(true);
    expect(eventTitles.some(t => t.includes("Consumo Elevado de Memória"))).toBe(true);
    expect(eventTitles.some(t => t.includes("Container Ativo"))).toBe(true);
  });

  it("FileManagerView e useFileManager hook devem ser exportados corretamente", async () => {
    const { FileManagerView } = await import("../../src/components/file-manager/FileManagerView");
    expect(typeof FileManagerView).toBe("function");

    const { useFileManager } = await import("../../src/components/file-manager/hooks/useFileManager");
    expect(typeof useFileManager).toBe("function");
  });

  it("AppShell e submódulos de shell devem ser exportados corretamente com seções de navegação válidas", async () => {
    const { AppShell, ADMIN_SECTIONS, CLIENT_SECTIONS } = await import("../../src/components/app/AppShell");
    expect(typeof AppShell).toBe("function");
    expect(Array.isArray(ADMIN_SECTIONS)).toBe(true);
    expect(Array.isArray(CLIENT_SECTIONS)).toBe(true);
    expect(ADMIN_SECTIONS.length).toBeGreaterThanOrEqual(4);
    expect(CLIENT_SECTIONS.length).toBeGreaterThanOrEqual(3);

    const shell = await import("../../src/components/app/shell");
    expect(typeof shell.SidebarSection).toBe("function");
    expect(typeof shell.NotificationMenu).toBe("function");
    expect(typeof shell.AppShellUserMenu).toBe("function");
    expect(typeof shell.AppShellBalanceCard).toBe("function");
    expect(typeof shell.AppShellBanners).toBe("function");
    expect(typeof shell.AppShellSidebar).toBe("function");
  });

  it("apps/list submódulos e helper de stack devem ser exportados corretamente", async () => {
    const appsList = await import("../../src/components/apps/list");
    expect(typeof appsList.AppCard).toBe("function");
    expect(typeof appsList.TemplateCard).toBe("function");
    expect(typeof appsList.TemplateCatalogTab).toBe("function");
    expect(typeof appsList.InstallTemplateModal).toBe("function");
    expect(typeof appsList.ResetAppDialog).toBe("function");
    expect(typeof appsList.getAppStackLabel).toBe("function");

    expect(appsList.getAppStackLabel({ name: "meu-wordpress" })).toBe("WordPress + PHP");
    expect(appsList.getAppStackLabel({ name: "bot-evolution-whatsapp" })).toBe("Evolution API");
    expect(appsList.getAppStackLabel({ name: "n8n-worker" })).toBe("N8N Automations");
    expect(appsList.getAppStackLabel({ name: "kuma-monitor" })).toBe("Uptime Kuma");
    expect(appsList.getAppStackLabel({ name: "generic-app", build_pack: "nodejs" })).toBe("NODEJS");
    expect(appsList.getAppStackLabel({ name: "outro" })).toBe("Docker Container");
  });

  it("checkout tipos, utilitários e submódulos devem calcular ciclos e exportar componentes corretamente", async () => {
    const { getCycleDetails, normalizeServiceKey, brl } = await import("../../src/components/checkout/types");
    expect(getCycleDetails("monthly").name).toBe("Mensal");
    expect(getCycleDetails("quarterly").name).toBe("Trimestral");
    expect(getCycleDetails("semiannually").name).toBe("Semestral");
    expect(getCycleDetails("annually").name).toBe("Anual");
    expect(getCycleDetails("biennially").name).toBe("Bienal");
    expect(getCycleDetails("triennially").name).toBe("Trienal");
    expect(getCycleDetails("one_time").name).toBe("Pagamento Único");
    expect(getCycleDetails("custom").name).toBe("custom");

    expect(normalizeServiceKey("containers")).toBe("containers");
    expect(normalizeServiceKey("paas")).toBe("containers");
    expect(normalizeServiceKey("bot")).toBe("containers");
    expect(normalizeServiceKey("directadmin")).toBe("directadmin");
    expect(normalizeServiceKey("hospedagem")).toBe("directadmin");
    expect(normalizeServiceKey("vps")).toBe("vps");
    expect(normalizeServiceKey("cloud")).toBe("vps");
    expect(normalizeServiceKey("invalid-service")).toBe(null);
    expect(normalizeServiceKey(undefined)).toBe(null);

    expect(brl.format(10)).toContain("10,00");

    const { buildServiceConfigs, getStartingPrice } = await import("../../src/components/checkout/catalog/catalog-config");
    expect(typeof buildServiceConfigs).toBe("function");
    expect(typeof getStartingPrice).toBe("function");

    const dummyGroup = {
      products: [
        {
          product_prices: [
            { cycle: "monthly", price: "29.90", is_active: true },
            { cycle: "monthly", price: "19.90", is_active: true },
          ],
        },
      ],
    };
    expect(getStartingPrice(dummyGroup)).toBe(19.9);
    expect(getStartingPrice(undefined)).toBe(null);

    const configs = buildServiceConfigs(dummyGroup, dummyGroup, dummyGroup);
    expect(configs.directadmin.title).toBe("DirectAdmin");
    expect(configs.containers.title).toBe("Containers");
    expect(configs.vps.title).toBe("VPS");

    const { CheckoutProgressBar } = await import("../../src/components/checkout/CheckoutProgressBar");
    const { StepBillingCycle } = await import("../../src/components/checkout/StepBillingCycle");
    const { CheckoutSummarySidebar } = await import("../../src/components/checkout/CheckoutSummarySidebar");
    const { ServiceCategorySelector } = await import("../../src/components/checkout/catalog/ServiceCategorySelector");
    const { ProductCatalogGrid } = await import("../../src/components/checkout/catalog/ProductCatalogGrid");
    const { useCheckoutProduct } = await import("../../src/components/checkout/hooks/useCheckoutProduct");

    expect(typeof CheckoutProgressBar).toBe("function");
    expect(typeof StepBillingCycle).toBe("function");
    expect(typeof CheckoutSummarySidebar).toBe("function");
    expect(typeof ServiceCategorySelector).toBe("function");
    expect(typeof ProductCatalogGrid).toBe("function");
    expect(typeof useCheckoutProduct).toBe("function");
  });

  it("apps/create submódulos e checkResourceCompatibility devem validar recursos e exportar componentes", async () => {
    const {
      checkResourceCompatibility,
      DeployTypeSelector,
      DeployZipSection,
      DeployGithubSection,
      DeployTemplateSection,
      CreateAppNameInput,
      CreateAppSidebar,
      useCreateApp,
    } = await import("../../src/components/apps/create");

    expect(typeof checkResourceCompatibility).toBe("function");
    expect(typeof DeployTypeSelector).toBe("function");
    expect(typeof DeployZipSection).toBe("function");
    expect(typeof DeployGithubSection).toBe("function");
    expect(typeof DeployTemplateSection).toBe("function");
    expect(typeof CreateAppNameInput).toBe("function");
    expect(typeof CreateAppSidebar).toBe("function");
    expect(typeof useCreateApp).toBe("function");

    const template: any = {
      id: "evolution-api",
      name: "Evolution API",
      recommended_ram: 1024,
      recommended_cpu: 1,
      recommended_disk: 1536,
    };

    // Cenário 1: RAM insuficiente
    const ramUnderpowered = checkResourceCompatibility(
      { memory_limit: 512, cpu_limit: 1, disk_limit_mb: 4096 },
      template,
      "templates"
    );
    expect(ramUnderpowered.isRamUnderpowered).toBe(true);
    expect(ramUnderpowered.isTemplateUnderpowered).toBe(true);

    // Cenário 2: vCPU insuficiente
    const cpuUnderpowered = checkResourceCompatibility(
      { memory_limit: 2048, cpu_limit: 0.5, disk_limit_mb: 4096 },
      template,
      "templates"
    );
    expect(cpuUnderpowered.isCpuUnderpowered).toBe(true);
    expect(cpuUnderpowered.isTemplateUnderpowered).toBe(true);

    // Cenário 3: Disco insuficiente (com margem de 20%)
    // template.recommended_disk = 1536, com margem de 20% = ceil(1536 * 1.2) = 1844
    const diskUnderpowered = checkResourceCompatibility(
      { memory_limit: 2048, cpu_limit: 2, disk_limit_mb: 1600 },
      template,
      "templates"
    );
    expect(diskUnderpowered.isDiskUnderpowered).toBe(true);
    expect(diskUnderpowered.isTemplateUnderpowered).toBe(true);
    expect(diskUnderpowered.requiredDiskWithMargin).toBe(1844);

    // Cenário 4: Recursos plenamente suficientes
    const sufficient = checkResourceCompatibility(
      { memory_limit: 2048, cpu_limit: 2, disk_limit_mb: 4096 },
      template,
      "templates"
    );
    expect(sufficient.isRamUnderpowered).toBe(false);
    expect(sufficient.isCpuUnderpowered).toBe(false);
    expect(sufficient.isDiskUnderpowered).toBe(false);
    expect(sufficient.isTemplateUnderpowered).toBe(false);

    // Cenário 5: Deploy via zip não deve acusar underpowered de templates
    const zipDeploy = checkResourceCompatibility(
      { memory_limit: 256, cpu_limit: 0.2, disk_limit_mb: 512 },
      template,
      "zip"
    );
    expect(zipDeploy.isTemplateUnderpowered).toBe(false);
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
