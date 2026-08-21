import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyAdminWhatsApp } from "./whatsapp.server";
import { sendEmail } from "./emails.server";
export async function logProvisioningAttempt({ serviceId, userId, status, errorCode, errorMessage, metadata = {}, }) {
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
            metadata: { ...metadata, attemptNumber: nextAttempt, errorCode }
        });
    }
    catch (error) {
        console.error("[ProvisioningAudit] Erro ao gravar log:", error);
    }
}
async function handleProvisioningFailure(serviceId, userId, error) {
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
    const settings = notifySettings?.value || { email_enabled: true, whatsapp_enabled: true };
    const productName = service?.products?.name || "Serviço";
    // Notificar Admin via WhatsApp (já existente, mas agora centralizado)
    if (settings.whatsapp_enabled) {
        await notifyAdminWhatsApp(`🚨 *FALHA DE PROVISIONAMENTO*\n\n*Serviço:* ${productName}\n*Cliente:* ${profile?.full_name}\n*Erro:* ${error}\n\nVerifique o dashboard admin.`, "provisioning_error");
    }
    // Notificar Admin via E-mail (Novo Requisito)
    if (settings.email_enabled) {
        const { data: adminEmailSetting } = await supabaseAdmin
            .from("system_settings")
            .select("value")
            .eq("key", "support_email")
            .maybeSingle();
        const adminEmail = adminEmailSetting?.value?.replace(/"/g, '') || "admin@eqsam.com";
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
