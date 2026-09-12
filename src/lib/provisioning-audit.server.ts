import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyAdminWhatsApp, sendWhatsAppMessage } from "./whatsapp.server";
import { sendEmail } from "./emails.server";

export async function logProvisioningAttempt({
  serviceId,
  userId,
  status,
  errorCode,
  errorMessage,
  metadata = {},
}: {
  serviceId: string;
  userId: string;
  status: 'success' | 'failure' | 'pending';
  errorCode?: string;
  errorMessage?: string;
  metadata?: any;
}) {
  try {
    try {
      await supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        action: status === 'success' ? 'provisioning_success' : 'provisioning_failure',
        entity_type: 'service',
        entity_id: serviceId,
        details: {
          status,
          error_code: errorCode,
          errorMessage,
          metadata,
          attempt_number: 1,
        }
      });
    } catch (auditErr) {
      console.warn("[ProvisioningAudit] Fallback de audit_logs:", auditErr);
    }

    // Se falhar, verificar configurações de notificação e enviar alertas
    if (status === 'failure') {
      await handleProvisioningFailure(serviceId, userId, errorMessage || "Erro desconhecido");
    }
    // Registrar log no sistema geral para auditoria centralizada
    const { createSystemLog } = await import("./system-logs.server");
    await createSystemLog({
      category: 'provisioning',
      level: status === 'success' ? 'info' : status === 'failure' ? 'error' : 'warning',
      message: status === 'success' 
        ? `Provisionamento concluído com sucesso: ${serviceId}` 
        : `Falha no provisionamento: ${errorMessage || 'Erro desconhecido'}`,
      serviceId,
      actorId: userId,
      metadata: { ...metadata, attemptNumber: 1, errorCode }
    });

  } catch (error) {
    console.error("[ProvisioningAudit] Erro ao gravar log:", error);
  }
}

async function handleProvisioningFailure(serviceId: string, userId: string, error: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", userId)
    .single();

  const { data: service } = await supabaseAdmin
    .from("services")
    .select("*, products(name)")
    .eq("id", serviceId)
    .single();

  const { data: notifySettings } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "provisioning_notification_settings")
    .maybeSingle();

  const settings = (notifySettings?.value as any) || { email_enabled: true, whatsapp_enabled: true };
  const productName = (service as any)?.products?.name || "Serviço";

  // Notificar Admin via WhatsApp (já existente, mas agora centralizado)
  if (settings.whatsapp_enabled) {
    await notifyAdminWhatsApp(
      `🚨 *FALHA DE PROVISIONAMENTO*\n\n*Serviço:* ${productName}\n*Cliente:* ${profile?.full_name}\n*Erro:* ${error}\n\nVerifique o dashboard admin.`,
      "provisioning_error"
    );
  }

  // Notificar Admin via E-mail (Novo Requisito)
  if (settings.email_enabled) {
    const { data: adminEmailSetting } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "support_email")
      .maybeSingle();
    
    const adminEmail = (adminEmailSetting?.value as string)?.replace(/"/g, '') || "admin@eqsam.com";
    
    // Importar dinamicamente para evitar ciclos de importação
    const { EMAIL_TEMPLATES } = await import("./emails.server");
    const template = EMAIL_TEMPLATES.provisioningError(productName, service?.domain || "sem domínio", error);

    await sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html("Eqsam Cloud"),
      templateName: "provisioning_failure_admin"
    });
  }
}

