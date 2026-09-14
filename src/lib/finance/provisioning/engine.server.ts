import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { handleWalletDepositProvisioning } from "./wallet-deposit.server";
import { handleDomainRegistrationProvisioning } from "./domain-registration.server";
import {
  handlePlanUpgradeProvisioning,
  handleServiceRenewalProvisioning,
} from "./service-lifecycle.server";
import {
  provisionDirectAdminHosting,
  provisionVpsInstance,
  provisionPaaSApplication,
} from "./service-creators.server";
import type { ProvisioningItemResult, ProvisioningResult } from "./types";

export async function processProvisioning(invoiceId: string): Promise<ProvisioningResult> {
  console.log(`[Provisioning] Iniciando processamento para fatura #${invoiceId}`);

  const { data: invoice, error: iError } = await supabaseAdmin
    .from("invoices")
    .select("*, invoice_items(*, services(*, products(*)))")
    .eq("id", invoiceId)
    .single();

  if (iError || !invoice) {
    console.error(`[Provisioning] Erro ao buscar fatura #${invoiceId}:`, iError);
    throw new Error("Fatura não encontrada");
  }

  if (invoice.status !== "paid") {
    console.warn(`[Provisioning] Abortando: fatura #${invoiceId} tem status ${invoice.status}`);
    return { success: false, message: "Fatura não está paga" };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", invoice.user_id)
    .single();

  const results: ProvisioningItemResult[] = [];

  for (const item of (invoice as any).invoice_items) {
    const service = item.services;
    const product = service?.products;

    // Caso Especial 1: Fatura de ADIÇÃO DE SALDO NA CARTEIRA (Depósito)
    if (
      item.description?.includes("Adição de Saldo na Carteira") ||
      item.description?.includes("Recarga de Saldo")
    ) {
      const depositResult = await handleWalletDepositProvisioning(invoice, item);
      results.push(depositResult);
      continue;
    }

    // Caso Especial 2: Fatura de REGISTRO DE DOMÍNIO
    if (
      item.description?.includes("Registro de Domínio:") ||
      item.description?.includes("Domínio:")
    ) {
      const domainResult = await handleDomainRegistrationProvisioning(invoice, item, profile);
      results.push(domainResult);
      continue;
    }

    if (!service) {
      console.warn(`[Provisioning] Item da fatura sem serviço associado. Fatura: #${invoiceId}`);
      continue;
    }

    // Caso Especial 3: Fatura de UPGRADE de plano para serviço já existente
    if (
      item.description?.includes("Upgrade de Plano:") ||
      item.description?.includes("Upgrade:")
    ) {
      const upgradeResult = await handlePlanUpgradeProvisioning(service, product, profile);
      results.push(upgradeResult);
      continue;
    }

    // Caso 4: Se o serviço já é existente e foi pago para renovação ou reativação
    if (service.status === "active" || service.status === "suspended") {
      const renewalResult = await handleServiceRenewalProvisioning(service, product, invoice);
      results.push(renewalResult);
      continue;
    }

    if (service.status !== "pending") {
      console.log(`[Provisioning] Serviço ${service.id} está com status '${service.status}'. Pulando.`);
      continue;
    }

    // Caso 5.1: Hospedagem via DirectAdmin
    if (product?.directadmin_package) {
      const hostingResult = await provisionDirectAdminHosting(service, product, invoice, profile);
      results.push(hostingResult);
    }
    // Caso 5.2: Instância VPS
    else if (product?.product_type === "vps") {
      const vpsResult = await provisionVpsInstance(service, product, invoice);
      results.push(vpsResult);
    }
    // Caso 5.3: Aplicações & Bots (Eqsam Cloud PaaS)
    else if (product?.product_type === "app" || product?.product_type === "bot") {
      const appResult = await provisionPaaSApplication(service, product);
      results.push(appResult);
    }
    // Caso 5.4: Sem regra de auto-provisionamento
    else {
      console.log(`[Provisioning] Produto sem regras de auto-provisionamento para serviço ${service.id}`);
      results.push({
        serviceId: service.id,
        success: true,
        message: "Sem provisionamento automático",
      });
    }
  }

  return { success: true, results };
}
