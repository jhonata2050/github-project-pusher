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
    // Buscar o número da última tentativa
    const { data: lastLog } = await supabaseAdmin
      .from("provisioning_logs")
      .select("attempt_number")
      .eq("service_id", serviceId)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextAttempt = (lastLog?.attempt_number || 0) + 1;

    await supabaseAdmin.from("provisioning_logs").insert({
      service_id: serviceId,
      user_id: userId,
      attempt_number: nextAttempt,
      status,
      error_code: errorCode,
      error_message: errorMessage,
      metadata,
    });

    // Se falhar, verificar configurações de notificação e enviar alertas
    if (status === 'failure') {
      await handleProvisioningFailure(serviceId, userId, errorMessage || "Erro desconhecido");
    }
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
    
    const adminEmail = adminEmailSetting?.value?.toString() || "admin@eqsam.com";

    await sendEmail({
      to: adminEmail,
      subject: `🚨 Falha de Provisionamento: ${productName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #fee2e2; border-radius: 12px;">
          <h2 style="color: #dc2626;">Falha no Provisionamento Automático</h2>
          <p><strong>Serviço:</strong> ${productName} (#${serviceId})</p>
          <p><strong>Cliente:</strong> ${profile?.full_name} (${profile?.email})</p>
          <p><strong>Erro Detectado:</strong> ${error}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 14px; color: #666;">Por favor, acesse o painel administrativo para resolver a pendência manualmente.</p>
        </div>
      `,
      templateName: "provisioning_failure_admin"
    });
  }
}
