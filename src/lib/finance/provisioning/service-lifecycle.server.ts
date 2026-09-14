import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWhatsAppMessage } from "../../whatsapp.server";
import type { ProvisioningItemResult } from "./types";

export function computeNextDueDate(cycle: string | null | undefined, baseDateString?: string | null): Date {
  const baseDate = new Date(
    baseDateString && new Date(baseDateString) > new Date()
      ? baseDateString
      : new Date()
  );
  let nextDueDate = new Date(baseDate);

  switch (cycle) {
    case "quarterly":
      nextDueDate.setMonth(nextDueDate.getMonth() + 3);
      break;
    case "semiannually":
      nextDueDate.setMonth(nextDueDate.getMonth() + 6);
      break;
    case "annually":
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
      break;
    case "biennially":
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 2);
      break;
    case "triennially":
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 3);
      break;
    case "monthly":
    default:
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      break;
  }
  return nextDueDate;
}

export async function handlePlanUpgradeProvisioning(
  service: any,
  product: any,
  profile: any
): Promise<ProvisioningItemResult> {
  console.log(`[Provisioning] Processando upgrade de plano para o serviço ${service.id}`);
  try {
    // Se o serviço está associado ao DirectAdmin, alterar o pacote no servidor
    if (service.server_id && service.username && product?.directadmin_package) {
      const { modifyDAUserPackage } = await import("../../directadmin.server");
      await modifyDAUserPackage(
        service.server_id,
        service.username,
        product.directadmin_package
      );
      console.log(
        `[Provisioning] Pacote DirectAdmin atualizado para '${product.directadmin_package}' no usuário ${service.username}`
      );
    }

    await supabaseAdmin
      .from("services")
      .update({
        notes: `Upgrade aplicado para ${product.name} em ${new Date().toLocaleDateString("pt-BR")}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", service.id);

    if (profile?.phone) {
      try {
        await sendWhatsAppMessage({
          to: profile.phone,
          message: `🚀 *Upgrade Concluído com Sucesso!*\n\nOlá ${profile.full_name},\nSeu plano foi atualizado para *${product.name}* com novos recursos liberados imediatamente!`,
          category: "service_upgrade",
        });
      } catch (e) {
        console.warn("[WhatsApp] Falha ao enviar notificação de upgrade:", e);
      }
    }

    return {
      serviceId: service.id,
      success: true,
      message: "Upgrade aplicado com sucesso",
    };
  } catch (err: any) {
    console.error(
      `[Provisioning] Erro ao aplicar upgrade no serviço ${service.id}:`,
      err.message
    );
    return { serviceId: service.id, success: false, error: err.message };
  }
}

export async function handleServiceRenewalProvisioning(
  service: any,
  product: any,
  invoice: any
): Promise<ProvisioningItemResult> {
  console.log(
    `[Provisioning] Processando RENOVAÇÃO/REATIVAÇÃO do serviço ${service.id} (Status anterior: ${service.status})`
  );

  const cycle = service.billing_cycle || "monthly";
  const nextDueDate = computeNextDueDate(cycle, service.next_due_date);

  // Se o serviço estava suspenso, reativar no provedor correspondente
  if (service.status === "suspended") {
    // DirectAdmin
    if (service.server_id && service.username) {
      try {
        const { unsuspendDAAccount } = await import("../../directadmin.server");
        await unsuspendDAAccount(service.server_id, service.username);
        console.log(`[Provisioning] Conta DirectAdmin ${service.username} reativada com sucesso.`);
      } catch (daErr: any) {
        console.warn(`[Provisioning] Aviso ao reativar no DirectAdmin:`, daErr.message);
      }
    }
    // Cloud Apps / Bots
    if (
      product?.product_type === "app" ||
      product?.product_type === "bot" ||
      service.app_uuid
    ) {
      try {
        const { startCloudApplication } = await import("../../cloud-apps.server");
        await startCloudApplication(service.id, invoice.user_id);
        console.log(`[Provisioning] Contêiner PaaS ${service.domain} reativado com sucesso.`);
      } catch (appErr: any) {
        console.warn(`[Provisioning] Aviso ao reativar contêiner PaaS:`, appErr.message);
      }
    }
  }

  await supabaseAdmin
    .from("services")
    .update({
      status: "active",
      next_due_date: nextDueDate.toISOString(),
      suspension_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", service.id);

  return {
    serviceId: service.id,
    success: true,
    message: `Serviço renovado com sucesso até ${nextDueDate.toLocaleDateString("pt-BR")}`,
  };
}
