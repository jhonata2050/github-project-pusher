import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createDAAccount } from "../../directadmin.server";
import { notifyAdminWhatsApp, sendWhatsAppMessage } from "../../whatsapp.server";
import { logProvisioningAttempt } from "../../provisioning-audit.server";
import type { ProvisioningItemResult } from "./types";

export async function provisionDirectAdminHosting(
  service: any,
  product: any,
  invoice: any,
  profile: any
): Promise<ProvisioningItemResult> {
  console.log(`[Provisioning] Provisionando hospedagem DirectAdmin para serviço ${service.id}`);

  const { data: server } = await supabaseAdmin
    .from("servers")
    .select("*")
    .limit(1)
    .single();

  if (!server) {
    const errorMsg = "Nenhum servidor DirectAdmin disponível para provisionamento automático.";
    console.error(`[Provisioning] ${errorMsg}`);

    await logProvisioningAttempt({
      serviceId: service.id,
      userId: invoice.user_id,
      status: "failure",
      errorCode: "NO_SERVER_AVAILABLE",
      errorMessage: errorMsg,
      metadata: { productId: product.id },
    });

    await supabaseAdmin
      .from("services")
      .update({
        notes: `ERRO CRÍTICO: ${errorMsg}`,
        status: "pending",
      })
      .eq("id", service.id);

    return { serviceId: service.id, success: false, error: errorMsg };
  }

  try {
    const username = service.username || `u${Math.random().toString(36).slice(-7)}`;
    const domain = service.domain || `${username}.temp.eqsam.com`;

    // Verificar se já existe para evitar conflito de domínio fatal
    const alreadyExists = await (
      await import("../../directadmin.server")
    ).checkDAUserExists(server.id, username, service.id);
    if (alreadyExists) {
      throw new Error(`Conflito: O usuário/domínio ${username} já está em uso neste servidor.`);
    }

    const result = (await createDAAccount(server.id, {
      username,
      domain,
      email: profile?.email || "user@example.com",
      package: product.directadmin_package,
    })) as any;

    // Validar se o DA retornou erro no corpo (mesmo com status 200)
    if (result && (result["error"] === "1" || result["error"] === 1)) {
      throw new Error(
        String(
          result["details"] ||
            result["text"] ||
            "O servidor DirectAdmin recusou a criação da conta."
        )
      );
    }

    // REGRA WHMCS: Senha do DirectAdmin é salva no serviço, separada da senha do Lovable
    await supabaseAdmin
      .from("services")
      .update({
        status: "active",
        username,
        server_id: server.id,
        domain,
        password: result.daPassword || null, // Armazena a senha gerada
        next_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "Provisionado automaticamente via DirectAdmin (Senha gerada e isolada)",
      } as any)
      .eq("id", service.id);

    await logProvisioningAttempt({
      serviceId: service.id,
      userId: invoice.user_id,
      status: "success",
      metadata: { username, domain, serverId: server.id },
    });

    console.log(`[Provisioning] Sucesso: serviço ${service.id} ativo no servidor ${server.id}`);

    // Notificações via WhatsApp
    try {
      if (profile?.phone) {
        await sendWhatsAppMessage({
          to: profile.phone,
          message: `✅ *Serviço Ativo!*\n\nOlá ${profile.full_name},\nSeu serviço *${product.name}* foi ativado com sucesso!\n\n*Domínio:* ${domain}\n*Usuário:* ${username}\n\nObrigado por escolher nossa plataforma!`,
          category: "service_activation",
        });
      }

      await notifyAdminWhatsApp(
        `🚀 *Serviço Provisionado*\n\n*Produto:* ${product.name}\n*Cliente:* ${profile?.full_name}\n*Domínio:* ${domain}`,
        "service_activation"
      );
    } catch (e) {
      console.warn("[WhatsApp] Falha ao enviar notificações:", e);
    }

    return { serviceId: service.id, success: true };
  } catch (err: any) {
    const errorDetail = err.message || "Erro desconhecido na API";
    console.error(`[Provisioning] Erro na API DirectAdmin para serviço ${service.id}:`, errorDetail);

    await logProvisioningAttempt({
      serviceId: service.id,
      userId: invoice.user_id,
      status: "failure",
      errorCode: "API_ERROR",
      errorMessage: errorDetail,
      metadata: { error: err },
    });

    await supabaseAdmin
      .from("services")
      .update({
        notes: `FALHA API: ${errorDetail}`,
        status: "pending",
      })
      .eq("id", service.id);

    return { serviceId: service.id, success: false, error: errorDetail };
  }
}

export async function provisionVpsInstance(
  service: any,
  product: any,
  invoice: any
): Promise<ProvisioningItemResult> {
  console.log(`[Provisioning] Provisionando VPS para o serviço ${service.id}.`);

  try {
    const { provisionContaboVPS } = await import("../../contabo.server");
    const provisioned = await provisionContaboVPS(service.id, {
      productId: (product as any).external_id || product.slug || "V4",
      hostname: service.vps_hostname,
      imageId: service.vps_os_template,
      region: service.vps_region,
      billingCycle: service.billing_cycle,
    } as any);

    await logProvisioningAttempt({
      serviceId: service.id,
      userId: invoice.user_id,
      status: "success",
      metadata: { externalId: provisioned.externalId, providerStatus: provisioned.status },
    });

    return { serviceId: service.id, success: true, externalId: provisioned.externalId };
  } catch (err: any) {
    const errorDetail = err?.message || "Falha desconhecida ao provisionar a VPS";
    await supabaseAdmin
      .from("services")
      .update({
        notes: `Falha no provisionamento automático da VPS: ${errorDetail}`,
        status: "pending",
      })
      .eq("id", service.id);
    await logProvisioningAttempt({
      serviceId: service.id,
      userId: invoice.user_id,
      status: "failure",
      errorCode: "VPS_API_ERROR",
      errorMessage: errorDetail,
      metadata: { productId: product.id, externalProductId: (product as any).external_id || product.slug },
    });
    return { serviceId: service.id, success: false, error: errorDetail };
  }
}

export async function provisionPaaSApplication(
  service: any,
  product: any
): Promise<ProvisioningItemResult> {
  console.log(`[Provisioning] Provisionando Aplicação Cloud PaaS para o serviço ${service.id}.`);
  try {
    const { provisionCloudApplication } = await import("../../cloud-apps.server");
    const app = await provisionCloudApplication(service.id, {
      name: service.domain || product.name,
      memoryLimit: 512,
      cpuLimit: 1.0,
      diskLimitMb: product.disk_quota_mb || 2048,
    });

    return { serviceId: service.id, success: true, appId: app.id, appUuid: app.app_uuid };
  } catch (err: any) {
    const errorDetail = err?.message || "Falha ao provisionar container PaaS";
    await supabaseAdmin
      .from("services")
      .update({
        notes: `Falha no provisionamento PaaS: ${errorDetail}`,
        status: "pending",
      })
      .eq("id", service.id);
    return { serviceId: service.id, success: false, error: errorDetail };
  }
}
