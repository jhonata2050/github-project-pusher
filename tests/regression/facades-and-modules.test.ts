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

    const { useAppManagement } = await import("../../src/components/apps/hooks/useAppManagement");
    expect(typeof useAppManagement).toBe("function");

    // Sub-hooks modulares de gestão de apps
    const appHooks = await import("../../src/components/apps/hooks");
    expect(typeof appHooks.useAppModals).toBe("function");
    expect(typeof appHooks.useAppDeployTracker).toBe("function");
    expect(typeof appHooks.useAppDomain).toBe("function");
    expect(typeof appHooks.useAppOperations).toBe("function");
    expect(typeof appHooks.detectPendingRequiredEnvs).toBe("function");
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

    // Sub-hooks modulares do File Manager
    const fmHooks = await import("../../src/components/file-manager/hooks");
    expect(typeof fmHooks.useFileManagerNavigation).toBe("function");
    expect(typeof fmHooks.useFileManagerSelection).toBe("function");
    expect(typeof fmHooks.useFileManagerModals).toBe("function");
    expect(typeof fmHooks.useFileManagerJobs).toBe("function");
    expect(typeof fmHooks.useFileManagerOperations).toBe("function");
    expect(typeof fmHooks.useFileManagerUpload).toBe("function");
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

  it("admin/servers submódulos devem ser exportados corretamente", async () => {
    const adminServers = await import("../../src/components/admin/servers");
    expect(typeof adminServers.ServerCommandsModal).toBe("function");
    expect(typeof adminServers.AddServerModal).toBe("function");
    expect(typeof adminServers.EditServerModal).toBe("function");
    expect(typeof adminServers.ServerCard).toBe("function");
    expect(typeof adminServers.ExternalProviderCard).toBe("function");
  });

  it("ssh-connection-manager.server fachada e submódulos ssh devem exportar todos os métodos, classes de erro e utilitários", async () => {
    const sshFacade = await import("../../src/lib/ssh-connection-manager.server");
    const sshModule = await import("../../src/lib/ssh");

    // Validação da Fachada
    expect(typeof sshFacade.SshConnectionManager).toBe("function");
    expect(typeof sshFacade.SshConnectionManager.getServerKey).toBe("function");
    expect(typeof sshFacade.SshConnectionManager.isConnectionAlive).toBe("function");
    expect(typeof sshFacade.SshConnectionManager.getConnection).toBe("function");
    expect(typeof sshFacade.SshConnectionManager.execCommand).toBe("function");
    expect(typeof sshFacade.SshConnectionManager.uploadBuffer).toBe("function");
    expect(typeof sshFacade.SshConnectionManager.getStatus).toBe("function");
    expect(typeof sshFacade.SshConnectionManager.getMetrics).toBe("function");
    expect(typeof sshFacade.SshConnectionManager.resetMetrics).toBe("function");
    expect(typeof sshFacade.SshConnectionManager.closeAll).toBe("function");

    // Classes de erro
    expect(typeof sshFacade.CircuitBreakerOpenError).toBe("function");
    expect(typeof sshFacade.SwarmAuthError).toBe("function");
    expect(typeof sshFacade.SshTimeoutError).toBe("function");
    expect(typeof sshFacade.SshSwarmTransport).toBe("function");

    // Validação do getServerKey
    const sampleServer = {
      id: "srv-primary",
      host: "10.0.0.1",
      sshPort: 2222,
      sshUser: "deployer",
    };
    expect(sshFacade.SshConnectionManager.getServerKey(sampleServer)).toBe("srv-primary:10.0.0.1:2222:deployer");
    expect(sshModule.getServerKey(sampleServer)).toBe("srv-primary:10.0.0.1:2222:deployer");

    // Fallbacks padrão do getServerKey
    expect(sshFacade.SshConnectionManager.getServerKey({})).toBe("default:45.159.172.137:30795:root");

    // Instanciação e comportamento de erros semânticos
    const cbError = new sshFacade.CircuitBreakerOpenError("srv-1", 15000);
    expect(cbError.name).toBe("CircuitBreakerOpenError");
    expect(cbError.serverKey).toBe("srv-1");
    expect(cbError.retryAfterMs).toBe(15000);
    expect(cbError.message).toContain("15s");

    const authError = new sshFacade.SwarmAuthError("srv-1", "Public key rejected");
    expect(authError.name).toBe("SwarmAuthError");
    expect(authError.serverKey).toBe("srv-1");
    expect(authError.message).toContain("Public key rejected");

    const timeoutError = new sshFacade.SshTimeoutError("docker ps", 5000);
    expect(timeoutError.name).toBe("SshTimeoutError");
    expect(timeoutError.command).toBe("docker ps");
    expect(timeoutError.timeoutMs).toBe(5000);

    // Instanciação de SshSwarmTransport e consulta de status
    const transport = new sshFacade.SshSwarmTransport(sampleServer);
    expect(typeof transport.exec).toBe("function");
    expect(typeof transport.uploadBuffer).toBe("function");
    const status = transport.getStatus();
    expect(status.state).toBe("disconnected");
    expect(status.circuit).toBe("CLOSED");
    expect(status.activeChannels).toBe(0);

    // Métricas
    sshFacade.SshConnectionManager.resetMetrics();
    const metrics = sshFacade.SshConnectionManager.getMetrics();
    expect(metrics.sshConnectionsCreated).toBe(0);
    expect(metrics.sshChannelsCreated).toBe(0);
  });

  it("filesystem fachada e submódulos fs devem reexportar todas as 17 funções e validar utilitários de disco", async () => {
    const fsFacade = await import("../../src/lib/file-manager/filesystem");
    const fsMeta = await import("../../src/lib/file-manager/fs/meta");
    const fsListing = await import("../../src/lib/file-manager/fs/listing");
    const fsMutations = await import("../../src/lib/file-manager/fs/mutations");
    const fsArchives = await import("../../src/lib/file-manager/fs/archives");
    const fsAudit = await import("../../src/lib/file-manager/fs/audit-and-metrics");

    // Validação de exportação na fachada
    expect(typeof fsFacade.formatBytes).toBe("function");
    expect(typeof fsFacade.getMimeType).toBe("function");
    expect(typeof fsFacade.parsePermissions).toBe("function");
    expect(typeof fsFacade.buildFileInfo).toBe("function");
    expect(typeof fsFacade.listRealDirectory).toBe("function");
    expect(typeof fsFacade.readRealFileContent).toBe("function");
    expect(typeof fsFacade.searchRealFiles).toBe("function");
    expect(typeof fsFacade.writeRealFileContent).toBe("function");
    expect(typeof fsFacade.createRealFile).toBe("function");
    expect(typeof fsFacade.createRealDirectory).toBe("function");
    expect(typeof fsFacade.deleteRealItems).toBe("function");
    expect(typeof fsFacade.renameRealItem).toBe("function");
    expect(typeof fsFacade.copyRealItems).toBe("function");
    expect(typeof fsFacade.moveRealItems).toBe("function");
    expect(typeof fsFacade.chmodRealItem).toBe("function");
    expect(typeof fsFacade.compressRealItems).toBe("function");
    expect(typeof fsFacade.extractRealArchive).toBe("function");
    expect(typeof fsFacade.auditLogOperation).toBe("function");
    expect(typeof fsFacade.calculateDirectorySize).toBe("function");

    // Validação de correspondência com submódulos
    expect(fsFacade.formatBytes).toBe(fsMeta.formatBytes);
    expect(fsFacade.listRealDirectory).toBe(fsListing.listRealDirectory);
    expect(fsFacade.writeRealFileContent).toBe(fsMutations.writeRealFileContent);
    expect(fsFacade.extractRealArchive).toBe(fsArchives.extractRealArchive);
    expect(fsFacade.calculateDirectorySize).toBe(fsAudit.calculateDirectorySize);

    // Teste de formatBytes
    expect(fsFacade.formatBytes(0)).toBe("0 B");
    expect(fsFacade.formatBytes(1024)).toBe("1 KB");
    expect(fsFacade.formatBytes(1024 * 1024 * 2.5)).toBe("2.5 MB");
    expect(fsFacade.formatBytes(1024 * 1024 * 1024 * 10)).toBe("10 GB");

    // Teste de getMimeType
    expect(fsFacade.getMimeType("index.html")).toBe("text/html");
    expect(fsFacade.getMimeType("server.ts")).toBe("application/typescript");
    expect(fsFacade.getMimeType("config.json")).toBe("application/json");
    expect(fsFacade.getMimeType("bundle.zip")).toBe("application/zip");
    expect(fsFacade.getMimeType("image.png")).toBe("image/png");
    expect(fsFacade.getMimeType("unknown.customext")).toBe("application/octet-stream");

    // Teste de parsePermissions
    const dirPerm = fsFacade.parsePermissions(0o755, true);
    expect(dirPerm.octal).toBe("0755");
    expect(dirPerm.rwx).toBe("drwxr-xr-x");

    const filePerm = fsFacade.parsePermissions(0o644, false);
    expect(filePerm.octal).toBe("0644");
    expect(filePerm.rwx).toBe("-rw-r--r--");

    const privDir = fsFacade.parsePermissions(0o700, true);
    expect(privDir.octal).toBe("0700");
    expect(privDir.rwx).toBe("drwx------");
  });

  it("ContainerLogsViewer e submódulos container-logs devem realizar parsing inteligente e exportar componentes", async () => {
    const viewer = await import("../../src/components/apps/ContainerLogsViewer");
    const logsModule = await import("../../src/components/apps/container-logs");

    expect(typeof viewer.ContainerLogsViewer).toBe("function");
    expect(typeof logsModule.LogsHeader).toBe("function");
    expect(typeof logsModule.LogsFilterBar).toBe("function");
    expect(typeof logsModule.LogsTerminalBody).toBe("function");
    expect(typeof logsModule.LogsFooter).toBe("function");
    expect(typeof logsModule.parseSingleLogLine).toBe("function");
    expect(typeof logsModule.useParsedLogs).toBe("function");
    expect(typeof logsModule.getEngineBadge).toBe("function");

    // Teste de getEngineBadge
    expect(logsModule.getEngineBadge("static")).toBe("Caddy Server 2 (HTTP/3)");
    expect(logsModule.getEngineBadge("dockerfile")).toBe("Dockerfile Container");
    expect(logsModule.getEngineBadge("dockercompose")).toBe("Docker Compose Stack");
    expect(logsModule.getEngineBadge("nixpacks")).toBe("Nixpacks Auto-Engine");
    expect(logsModule.getEngineBadge(undefined)).toBe("Cluster Service");
    expect(logsModule.getEngineBadge("custom")).toBe("custom");

    // Teste de parseSingleLogLine - Swarm
    const swarmLine = logsModule.parseSingleLogLine("2026-09-14T12:00:00Z app_test_web.1.abc@dk1 | Server ready", 0);
    expect(swarmLine.id).toBe("log-0");
    expect(swarmLine.source).toBe("web.1.abc@dk1");
    expect(swarmLine.message).toBe("Server ready");
    expect(swarmLine.level).toBe("info");
    expect(swarmLine.isJson).toBe(false);

    // Teste de parseSingleLogLine - JSON estruturado de erro
    const jsonError = logsModule.parseSingleLogLine(
      JSON.stringify({ level: "error", msg: "Database connection failed", port: 5432 }),
      1
    );
    expect(jsonError.level).toBe("error");
    expect(jsonError.message).toBe("Database connection failed");
    expect(jsonError.meta.port).toBe(5432);
    expect(jsonError.isJson).toBe(true);

    // Teste de parseSingleLogLine - Heurística de texto plano
    const plainWarn = logsModule.parseSingleLogLine("Warning: memory threshold exceeded (85%)", 2);
    expect(plainWarn.level).toBe("warn");
    expect(plainWarn.message).toContain("Warning: memory threshold exceeded");
  });

  it("Affiliates Facade e Submódulos devem exportar todas as funções contratuais e utilitários", async () => {
    // 1. Teste da fachada do servidor
    const affiliatesFacade = await import("../../src/lib/affiliates.server");
    expect(typeof affiliatesFacade.getOrCreateAffiliate).toBe("function");
    expect(typeof affiliatesFacade.trackAffiliateClick).toBe("function");
    expect(typeof affiliatesFacade.getGlobalAffiliateSettings).toBe("function");
    expect(typeof affiliatesFacade.saveGlobalAffiliateSettings).toBe("function");
    expect(typeof affiliatesFacade.getProductCommissionSettings).toBe("function");
    expect(typeof affiliatesFacade.saveProductCommissionSettings).toBe("function");
    expect(typeof affiliatesFacade.updateAffiliatePercent).toBe("function");
    expect(typeof affiliatesFacade.processAffiliateCommission).toBe("function");
    expect(typeof affiliatesFacade.withdrawAffiliateToWallet).toBe("function");
    expect(typeof affiliatesFacade.getAffiliateReferrals).toBe("function");
    expect(typeof affiliatesFacade.getAdminAffiliatesList).toBe("function");

    // 2. Teste de geração de código de afiliado (store.server)
    const { generateAffiliateCode } = await import("../../src/lib/affiliates/store.server");
    expect(typeof generateAffiliateCode).toBe("function");

    const code1 = generateAffiliateCode("João Silva", "joao@exemplo.com");
    expect(code1).toMatch(/^joaosilv\d{3}$/);

    const code2 = generateAffiliateCode(undefined, "contato@empresa.com.br");
    expect(code2).toMatch(/^contato\d{3}$/);

    const codeFallback = generateAffiliateCode();
    expect(codeFallback).toMatch(/^indica\d{3}$/);

    // 3. Teste dos componentes do painel administrativo
    const adminAffiliates = await import("../../src/components/admin/affiliates");
    expect(typeof adminAffiliates.AffiliatesKpiCards).toBe("function");
    expect(typeof adminAffiliates.ProductCommissionsTab).toBe("function");
    expect(typeof adminAffiliates.AffiliatesListTab).toBe("function");
    expect(typeof adminAffiliates.GlobalSettingsTab).toBe("function");
    expect(typeof adminAffiliates.EditAffiliateModal).toBe("function");
  });

  it("Admin Facade e Submódulos devem exportar branding, gestão de clientes e stats", async () => {
    const adminFacade = await import("../../src/lib/admin.server");
    expect(adminFacade.DEFAULT_BRANDING).toBeDefined();
    expect(adminFacade.DEFAULT_BRANDING.app_name).toBe("Eqsam");
    expect(typeof adminFacade.getBrandingImplementation).toBe("function");
    expect(typeof adminFacade.updateBrandingImplementation).toBe("function");
    expect(typeof adminFacade.updateClientProfileImplementation).toBe("function");
    expect(typeof adminFacade.adminChangeUserPasswordImplementation).toBe("function");
    expect(typeof adminFacade.adminSendPasswordResetImplementation).toBe("function");
    expect(typeof adminFacade.bulkDeleteClientsImplementation).toBe("function");
    expect(typeof adminFacade.getAdminStatsImplementation).toBe("function");
    expect(typeof adminFacade.getLeadSourceStatsImplementation).toBe("function");

    // Submódulo branding
    const brandingModule = await import("../../src/lib/admin/branding.server");
    expect(typeof brandingModule.getBrandingImplementation).toBe("function");
    expect(typeof brandingModule.updateBrandingImplementation).toBe("function");
    expect(brandingModule.DEFAULT_BRANDING.favicon_url).toBe("/images/logo.png");

    // Submódulo clients
    const clientsModule = await import("../../src/lib/admin/clients.server");
    expect(typeof clientsModule.updateClientProfileImplementation).toBe("function");
    expect(typeof clientsModule.adminChangeUserPasswordImplementation).toBe("function");
    expect(typeof clientsModule.adminSendPasswordResetImplementation).toBe("function");
    expect(typeof clientsModule.bulkDeleteClientsImplementation).toBe("function");

    // Submódulo stats
    const statsModule = await import("../../src/lib/admin/stats.server");
    expect(typeof statsModule.getAdminStatsImplementation).toBe("function");
    expect(typeof statsModule.getLeadSourceStatsImplementation).toBe("function");
  });

  it("swarm-files.server fachada e submódulos devem exportar operações de sincronização, pull e mutações", async () => {
    const swarmFiles = await import("../../src/lib/swarm/swarm-files.server");
    expect(typeof swarmFiles.syncFilesToSwarmContainer).toBe("function");
    expect(typeof swarmFiles.pullRealFilesFromSwarm).toBe("function");
    expect(typeof swarmFiles.writeRemoteSwarmFile).toBe("function");
    expect(typeof swarmFiles.deleteRemoteSwarmItems).toBe("function");
    expect(typeof swarmFiles.createRemoteSwarmDirectory).toBe("function");

    // Submódulo sftp
    const sftpModule = await import("../../src/lib/swarm/files/sftp.server");
    expect(typeof sftpModule.uploadSftpBuffer).toBe("function");

    // Submódulo sync
    const syncModule = await import("../../src/lib/swarm/files/sync.server");
    expect(typeof syncModule.syncFilesToSwarmContainer).toBe("function");

    // Submódulo pull
    const pullModule = await import("../../src/lib/swarm/files/pull.server");
    expect(typeof pullModule.pullRealFilesFromSwarm).toBe("function");

    // Submódulo mutations
    const mutationsModule = await import("../../src/lib/swarm/files/mutations.server");
    expect(typeof mutationsModule.writeRemoteSwarmFile).toBe("function");
    expect(typeof mutationsModule.deleteRemoteSwarmItems).toBe("function");
    expect(typeof mutationsModule.createRemoteSwarmDirectory).toBe("function");
  });

  it("cloud-apps/deployer.server fachada e submódulos devem exportar deploy de template, git e detector de buildpack", async () => {
    const deployer = await import("../../src/lib/cloud-apps/deployer.server");
    expect(typeof deployer.applyTemplateToApplication).toBe("function");
    expect(typeof deployer.deployCloudApplicationFromGit).toBe("function");
    expect(typeof deployer.detectProjectBuildpack).toBe("function");

    // Submódulo buildpack-detector
    const detectorModule = await import("../../src/lib/cloud-apps/deploy/buildpack-detector");
    expect(typeof detectorModule.detectProjectBuildpack).toBe("function");

    // Submódulo template-deployer
    const templateModule = await import("../../src/lib/cloud-apps/deploy/template-deployer.server");
    expect(typeof templateModule.applyTemplateToApplication).toBe("function");

    // Submódulo git-deployer
    const gitModule = await import("../../src/lib/cloud-apps/deploy/git-deployer.server");
    expect(typeof gitModule.deployCloudApplicationFromGit).toBe("function");
  });

  it("ClientAddServiceModal e submódulos add-service devem ser exportados corretamente", async () => {
    const modalModule = await import("../../src/components/admin/clients/modals/ClientAddServiceModal");
    expect(typeof modalModule.ClientAddServiceModal).toBe("function");

    const addServiceModule = await import("../../src/components/admin/clients/modals/add-service");
    expect(typeof addServiceModule.HostingFieldsSection).toBe("function");
    expect(typeof addServiceModule.VpsFieldsSection).toBe("function");
    expect(typeof addServiceModule.BillingFieldsSection).toBe("function");
  });

  it("admin products subcomponentes devem ser exportados corretamente com helpers e labels", async () => {
    const productsComponents = await import("../../src/components/admin/products");
    expect(typeof productsComponents.ProductCard).toBe("function");
    expect(typeof productsComponents.ProductsHeader).toBe("function");
    expect(typeof productsComponents.ProductEditDialog).toBe("function");
    expect(typeof productsComponents.CYCLE_LABELS).toBe("object");
    expect(productsComponents.CYCLE_LABELS.monthly).toBe("mês");
    expect(productsComponents.CYCLE_LABELS.annually).toBe("ano");
    expect(productsComponents.brl).toBeDefined();
    expect(productsComponents.brl.format(10)).toContain("10");
  });

  it("admin invoices subcomponentes devem ser exportados corretamente com tabela, modal e helpers de status", async () => {
    const invoicesComponents = await import("../../src/components/admin/invoices");
    expect(typeof invoicesComponents.InvoicesTable).toBe("function");
    expect(typeof invoicesComponents.InvoiceManageModal).toBe("function");
    expect(typeof invoicesComponents.STATUS_LABELS).toBe("object");
    expect(invoicesComponents.STATUS_LABELS.paid.label).toBe("Paga");
    expect(invoicesComponents.STATUS_LABELS.pending.label).toBe("Pendente");
    expect(invoicesComponents.brl).toBeDefined();
    expect(invoicesComponents.brl.format(50)).toContain("50");
  });

  it("admin domains subcomponentes devem ser exportados corretamente com as abas de domínios, preços e provedores", async () => {
    const domainsComponents = await import("../../src/components/admin/domains");
    expect(typeof domainsComponents.DomainsListTab).toBe("function");
    expect(typeof domainsComponents.DomainPricingTab).toBe("function");
    expect(typeof domainsComponents.DomainProvidersTab).toBe("function");
  });

  it("file-manager dialogs subcomponentes devem ser exportados corretamente", async () => {
    const dialogs = await import("../../src/components/file-manager/FileManagerDialogs");
    expect(typeof dialogs.FileManagerDialogs).toBe("function");

    const dialogSubmodules = await import("../../src/components/file-manager/dialogs");
    expect(typeof dialogSubmodules.NewItemDialogs).toBe("function");
    expect(typeof dialogSubmodules.RenameDialog).toBe("function");
    expect(typeof dialogSubmodules.MoveCopyDialog).toBe("function");
    expect(typeof dialogSubmodules.CompressDialog).toBe("function");
    expect(typeof dialogSubmodules.ExtractConflictDialog).toBe("function");
    expect(typeof dialogSubmodules.JobProgressDialog).toBe("function");
    expect(typeof dialogSubmodules.DeleteConfirmDialog).toBe("function");
  });

  it("auth subcomponentes e schemas de validação devem operar corretamente", async () => {
    const authComponents = await import("../../src/components/auth");
    expect(typeof authComponents.AuthDesktopBanner).toBe("function");
    expect(typeof authComponents.AuthMobileBanner).toBe("function");
    expect(typeof authComponents.AuthLogo).toBe("function");
    expect(typeof authComponents.GoogleAuthButton).toBe("function");
    expect(typeof authComponents.GoogleIcon).toBe("function");
    expect(typeof authComponents.SignupFields).toBe("function");
    expect(typeof authComponents.CheckEmailView).toBe("function");
    expect(typeof authComponents.ForgotPasswordTrigger).toBe("function");

    // Validação de schemas Zod
    expect(authComponents.emailSchema.safeParse("user@example.com").success).toBe(true);
    expect(authComponents.emailSchema.safeParse("invalid-email").success).toBe(false);

    // Validação de regras de senha (min 8, maiúscula, minúscula, número, caractere especial)
    expect(authComponents.passwordSchema.safeParse("Weak123").success).toBe(false);
    expect(authComponents.passwordSchema.safeParse("StrongP@ssw0rd!").success).toBe(true);

    const signupValid = authComponents.signupSchema.safeParse({
      fullName: "Cliente Teste",
      phone: "+55 11 99999-9999",
      tax_id: "123.456.789-00",
      identification_type: "cpf",
      country: "BR",
      email: "cliente@teste.com",
      password: "StrongP@ssw0rd!",
      leadSource: "Google",
    });
    expect(signupValid.success).toBe(true);
  });

  it("provisioning.server fachada e submódulos devem reexportar e calcular ciclos sem regressão", async () => {
    const provisioningFacade = await import("../../src/lib/finance/provisioning.server");
    expect(typeof provisioningFacade.processProvisioning).toBe("function");
    expect(typeof provisioningFacade.handleWalletDepositProvisioning).toBe("function");
    expect(typeof provisioningFacade.handleDomainRegistrationProvisioning).toBe("function");
    expect(typeof provisioningFacade.handlePlanUpgradeProvisioning).toBe("function");
    expect(typeof provisioningFacade.handleServiceRenewalProvisioning).toBe("function");
    expect(typeof provisioningFacade.provisionDirectAdminHosting).toBe("function");
    expect(typeof provisioningFacade.provisionVpsInstance).toBe("function");
    expect(typeof provisioningFacade.provisionPaaSApplication).toBe("function");
    expect(typeof provisioningFacade.computeNextDueDate).toBe("function");

    // Validação de cálculo de vencimento por ciclo (usando data futura intermediária para testar prorrogação)
    const baseDate = new Date(2029, 0, 15);
    const baseStr = baseDate.toISOString();

    const monthly = provisioningFacade.computeNextDueDate("monthly", baseStr);
    expect(monthly.getMonth()).toBe((baseDate.getMonth() + 1) % 12);

    const quarterly = provisioningFacade.computeNextDueDate("quarterly", baseStr);
    expect(quarterly.getMonth()).toBe((baseDate.getMonth() + 3) % 12);

    const semiannually = provisioningFacade.computeNextDueDate("semiannually", baseStr);
    expect(semiannually.getMonth()).toBe((baseDate.getMonth() + 6) % 12);

    const annually = provisioningFacade.computeNextDueDate("annually", baseStr);
    expect(annually.getFullYear()).toBe(baseDate.getFullYear() + 1);

    const biennially = provisioningFacade.computeNextDueDate("biennially", baseStr);
    expect(biennially.getFullYear()).toBe(baseDate.getFullYear() + 2);

    const triennially = provisioningFacade.computeNextDueDate("triennially", baseStr);
    expect(triennially.getFullYear()).toBe(baseDate.getFullYear() + 3);
  });

  it("services subcomponentes de gerenciamento de serviço devem ser exportados corretamente", async () => {
    const servicesComponents = await import("../../src/components/services");
    expect(typeof servicesComponents.BlockedServiceAlert).toBe("function");
    expect(typeof servicesComponents.ServerDetailsCard).toBe("function");
    expect(typeof servicesComponents.ServiceStatusCard).toBe("function");
    expect(typeof servicesComponents.QuickActionCard).toBe("function");
    expect(typeof servicesComponents.ServiceQuickActions).toBe("function");
    expect(typeof servicesComponents.ServiceDetailsSkeleton).toBe("function");
    expect(typeof servicesComponents.UpgradePlanDialog).toBe("function");
  });

  it("profile subcomponentes e schema de validação devem operar corretamente", async () => {
    const profileComponents = await import("../../src/components/profile");
    expect(typeof profileComponents.ProfileIdentitySection).toBe("function");
    expect(typeof profileComponents.ProfileBillingAddressSection).toBe("function");
    expect(typeof profileComponents.ProfileAccountSummaryCard).toBe("function");
    expect(typeof profileComponents.ProfileThemeSelector).toBe("function");
    expect(typeof profileComponents.EMPTY_PROFILE_FORM).toBe("object");

    // Validação de schema Zod do perfil
    const validProfile = profileComponents.profileSchema.safeParse({
      full_name: "Cliente Teste",
      company_name: "Minha Empresa",
      tax_id: "123.456.789-00",
      identification_type: "cpf",
      country: "BR",
      phone: "+55 11 99999-9999",
      address_line: "Av. Paulista, 1000",
      address_line2: "Apto 101",
      city: "São Paulo",
      state: "SP",
      postal_code: "01310-100",
    });
    expect(validProfile.success).toBe(true);

    const invalidProfile = profileComponents.profileSchema.safeParse({
      full_name: "A", // muito curto (< 2)
      tax_id: "12", // muito curto (< 5)
      identification_type: "",
      country: "",
      phone: "12",
      address_line: "",
      city: "",
    });
    expect(invalidProfile.success).toBe(false);
  });

  it("admin finance subcomponentes e abas devem ser exportados corretamente", async () => {
    const adminFinance = await import("../../src/components/admin/finance");
    expect(typeof adminFinance.GatewayCard).toBe("function");
    expect(typeof adminFinance.FinanceGeneralTab).toBe("function");
    expect(typeof adminFinance.FinanceGatewaysTab).toBe("function");
    expect(typeof adminFinance.FinancePrioritiesTab).toBe("function");
    expect(typeof adminFinance.FinanceNotificationsTab).toBe("function");
  });

  it("admin dashboard subcomponentes e widgets devem ser exportados corretamente", async () => {
    const adminDashboard = await import("../../src/components/admin/dashboard");
    expect(typeof adminDashboard.AdminStatCards).toBe("function");
    expect(typeof adminDashboard.AdminStatCardsSkeleton).toBe("function");
    expect(typeof adminDashboard.CriticalTicketsCard).toBe("function");
    expect(typeof adminDashboard.ProvisioningAlertCard).toBe("function");
    expect(typeof adminDashboard.FinancialPerformanceCard).toBe("function");
    expect(typeof adminDashboard.OperationalShortcutsCard).toBe("function");
    expect(typeof adminDashboard.SystemHealthCard).toBe("function");
    expect(typeof adminDashboard.LeadSourceChartCard).toBe("function");
    expect(typeof adminDashboard.ProvisioningAuditModal).toBe("function");
    expect(typeof adminDashboard.getSLAStatus).toBe("function");
    expect(typeof adminDashboard.formatCurrency).toBe("function");

    // Validação do helper de SLA
    const recentDate = new Date().toISOString();
    expect(adminDashboard.getSLAStatus(recentDate).label).toBe("PENDENTE");

    const oldDate = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    expect(adminDashboard.getSLAStatus(oldDate).label).toBe("CRÍTICO (>24h)");
  });

  it("admin vps plans subcomponentes e constantes devem ser exportados corretamente", async () => {
    const vpsPlans = await import("../../src/components/admin/vps/plans");
    expect(typeof vpsPlans.VPSPlansHeader).toBe("function");
    expect(typeof vpsPlans.VPSPlanCard).toBe("function");
    expect(typeof vpsPlans.VPSPlansList).toBe("function");
    expect(typeof vpsPlans.VPSPlanEditDialog).toBe("function");
    expect(typeof vpsPlans.formatBRL).toBe("function");
    expect(typeof vpsPlans.getPublicOrigin).toBe("function");
    expect(vpsPlans.CYCLE_LABELS.monthly).toBe("mês");
    expect(vpsPlans.formatBRL(49.9)).toContain("49,90");
  });

  it("admin vps instances subcomponentes e modais devem ser exportados corretamente", async () => {
    const vpsInstances = await import("../../src/components/admin/vps/instances");
    expect(typeof vpsInstances.AdminVPSHeader).toBe("function");
    expect(typeof vpsInstances.VPSInstancesTable).toBe("function");
    expect(typeof vpsInstances.SyncContaboModal).toBe("function");
    expect(typeof vpsInstances.AssignInstanceModal).toBe("function");
    expect(typeof vpsInstances.SSHConfigModal).toBe("function");
  });

  it("cloud-apps lifecycle fachada e submódulos devem reexportar todas as operações de ciclo de vida", async () => {
    const lifecycleFacade = await import("../../src/lib/cloud-apps/lifecycle.server");
    expect(typeof lifecycleFacade.provisionCloudApplication).toBe("function");
    expect(typeof lifecycleFacade.executeCloudAppAction).toBe("function");
    expect(typeof lifecycleFacade.startCloudApplication).toBe("function");
    expect(typeof lifecycleFacade.stopCloudApplication).toBe("function");
    expect(typeof lifecycleFacade.resetCloudApplication).toBe("function");
    expect(typeof lifecycleFacade.getCloudApplicationDetails).toBe("function");
    expect(typeof lifecycleFacade.getCloudApplicationLogs).toBe("function");
    expect(typeof lifecycleFacade.getCloudDeploymentStatus).toBe("function");
    expect(lifecycleFacade.activeDeployments).toBeInstanceOf(Map);

    const lifecycleSubmodule = await import("../../src/lib/cloud-apps/lifecycle");
    expect(lifecycleSubmodule.provisionCloudApplication).toBe(lifecycleFacade.provisionCloudApplication);
    expect(lifecycleSubmodule.executeCloudAppAction).toBe(lifecycleFacade.executeCloudAppAction);
    expect(lifecycleSubmodule.resetCloudApplication).toBe(lifecycleFacade.resetCloudApplication);
    expect(lifecycleSubmodule.getCloudApplicationDetails).toBe(lifecycleFacade.getCloudApplicationDetails);
  });

  it("tickets componentes modulares devem exportar os blocos estruturais do detalhe de ticket", async () => {
    const tickets = await import("../../src/components/tickets");
    expect(typeof tickets.TicketHeader).toBe("function");
    expect(typeof tickets.TicketMessageList).toBe("function");
    expect(typeof tickets.TicketReplyForm).toBe("function");
    expect(typeof tickets.TicketSidebarInfo).toBe("function");
    expect(typeof tickets.STATUS_MAP).toBe("object");
    expect(typeof tickets.getTicketStatusInfo).toBe("function");
  });

  it("admin database componentes modulares devem exportar os blocos de header, backups, conexão e usuários", async () => {
    const dbComponents = await import("../../src/components/admin/database");
    expect(typeof dbComponents.DatabaseHeader).toBe("function");
    expect(typeof dbComponents.DatabaseBackupsTab).toBe("function");
    expect(typeof dbComponents.DatabaseConnectionTab).toBe("function");
    expect(typeof dbComponents.DatabaseUsersTab).toBe("function");
  });

  it("whmcs-import.server fachada e submódulo devem reexportar todas as operações de importação", async () => {
    const whmcsFacade = await import("../../src/lib/whmcs-import.server");
    expect(typeof whmcsFacade.startImportJob).toBe("function");
    expect(typeof whmcsFacade.importBatch).toBe("function");
    expect(typeof whmcsFacade.finishImportJob).toBe("function");
    expect(typeof whmcsFacade.emptyStats).toBe("function");
    expect(typeof whmcsFacade.pick).toBe("function");
    expect(typeof whmcsFacade.toDate).toBe("function");
    expect(typeof whmcsFacade.toNumber).toBe("function");
    expect(typeof whmcsFacade.resolveUserId).toBe("function");
    expect(typeof whmcsFacade.resolveProductId).toBe("function");
    expect(typeof whmcsFacade.importClients).toBe("function");
    expect(typeof whmcsFacade.importServices).toBe("function");
    expect(typeof whmcsFacade.importInvoices).toBe("function");

    const whmcsSubmodule = await import("../../src/lib/whmcs");
    expect(whmcsSubmodule.startImportJob).toBe(whmcsFacade.startImportJob);
    expect(whmcsSubmodule.importBatch).toBe(whmcsFacade.importBatch);
    expect(whmcsSubmodule.finishImportJob).toBe(whmcsFacade.finishImportJob);
    expect(whmcsSubmodule.emptyStats).toBe(whmcsFacade.emptyStats);
  });

  it("invoices componentes modulares devem exportar os blocos estruturais do detalhe da fatura", async () => {
    const invoices = await import("../../src/components/invoices");
    expect(typeof invoices.InvoiceHeader).toBe("function");
    expect(typeof invoices.InvoiceItemsTable).toBe("function");
    expect(typeof invoices.InvoiceNotesCard).toBe("function");
    expect(typeof invoices.InvoicePaymentCard).toBe("function");
    expect(typeof invoices.STATUS_LABELS).toBe("object");
    expect(Array.isArray(invoices.METHOD_OPTIONS)).toBe(true);
    expect(typeof invoices.getInvoiceStatusInfo).toBe("function");
  });

  it("apps domains componentes modulares devem exportar os cards de subdomínio, conexão e dns", async () => {
    const domains = await import("../../src/components/apps/domains");
    expect(typeof domains.DomainSubdomainCard).toBe("function");
    expect(typeof domains.DomainCustomConnectionCard).toBe("function");
    expect(typeof domains.DomainDnsInstructionsCard).toBe("function");

    const tab = await import("../../src/components/apps/tabs/AppDomainsTab");
    expect(typeof tab.AppDomainsTab).toBe("function");
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
