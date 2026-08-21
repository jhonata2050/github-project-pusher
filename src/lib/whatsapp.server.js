import { supabaseAdmin } from "@/integrations/supabase/client.server";
/**
 * Função centralizada para enviar mensagens via Evolution API v2
 */
export async function sendWhatsAppMessage({ to, message, category = "system", }) {
    try {
        // 1. Buscar configurações
        const { data: settings } = await supabaseAdmin
            .from("system_settings")
            .select("*")
            .in("key", [
            "whatsapp_enabled",
            "whatsapp_evolution_url",
            "whatsapp_evolution_token",
            "whatsapp_evolution_instance"
        ]);
        const config = {};
        settings?.forEach((s) => {
            config[s.key] = s.value;
        });
        if (config["whatsapp_enabled"] !== true && config["whatsapp_enabled"] !== "true") {
            console.log("[WhatsApp] Notificações desativadas globalmente.");
            return { success: false, reason: "disabled" };
        }
        const evolutionUrl = config["whatsapp_evolution_url"]?.toString().replace(/\/$/, "");
        const token = config["whatsapp_evolution_token"]?.toString();
        const instance = config["whatsapp_evolution_instance"]?.toString();
        if (!evolutionUrl || !token || !instance) {
            console.warn("[WhatsApp] Configurações da Evolution API v2 incompletas.");
            return { success: false, reason: "incomplete_config" };
        }
        // 2. Limpar número (deve ser apenas dígitos com DDI)
        const cleanNumber = to.replace(/\D/g, "");
        // Envio específico para Evolution API v2 (instância no path)
        const whatsappNumber = cleanNumber.includes("@") ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;
        const targetUrl = `${evolutionUrl}/message/sendText/${instance}`;
        const payload = {
            number: whatsappNumber,
            text: message,
            delay: 0,
            linkPreview: true
        };
        try {
            const response = await fetch(targetUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": token
                },
                body: JSON.stringify(payload)
            });
            const responseText = await response.text();
            let responseData = {};
            try {
                responseData = JSON.parse(responseText);
            }
            catch (e) {
                responseData = { raw: responseText };
            }
            if (!response.ok) {
                console.error("[WhatsApp] Falha no envio Evolution API v2:", {
                    status: response.status,
                    data: responseData
                });
                await supabaseAdmin.from("audit_logs").insert({
                    category: "whatsapp",
                    action: "whatsapp.send_failed",
                    status: "failure",
                    description: `Erro na Evolution API v2 (${response.status}). URL: ${targetUrl}`,
                    metadata: { to, category, response: responseData, payload: { ...payload, text: "REDACTED" } }
                });
                let errorMessage = "Erro desconhecido na API";
                if (response.status === 404) {
                    errorMessage = "Endpoint não encontrado (404). Verifique se a URL da API está correta e se a instância existe.";
                }
                else if (responseData.message) {
                    errorMessage = Array.isArray(responseData.message) ? responseData.message.join(", ") : responseData.message;
                }
                return { success: false, error: errorMessage };
            }
            // 4. Log de sucesso na auditoria
            await supabaseAdmin.from("audit_logs").insert({
                category: "whatsapp",
                action: "whatsapp.sent",
                status: "success",
                description: `Mensagem enviada com sucesso para ${to} via Evolution API v2`,
                metadata: { to, category, instance }
            });
            return { success: true, data: responseData };
        }
        catch (e) {
            console.error("[WhatsApp] Exceção ao conectar na Evolution Go:", e);
            return { success: false, error: `Falha de conexão: ${e.message}` };
        }
    }
    catch (error) {
        console.error("[WhatsApp] Exceção ao enviar mensagem:", error);
        return { success: false, error: error.message };
    }
}
/**
 * Notifica o administrador sobre eventos críticos
 */
export async function notifyAdminWhatsApp(message, eventType) {
    const { data: setting } = await supabaseAdmin
        .from("system_settings")
        .select("value")
        .eq("key", "whatsapp_admin_phone")
        .maybeSingle();
    const adminPhone = setting?.value?.toString();
    if (!adminPhone) {
        console.log("[WhatsApp] Telefone do administrador não configurado.");
        return;
    }
    // Verificar se este tipo de evento deve ser notificado ao admin
    const { data: notifySettings } = await supabaseAdmin
        .from("system_settings")
        .select("value")
        .eq("key", "whatsapp_notify_admin_settings")
        .maybeSingle();
    const settings = notifySettings?.value || {};
    if (settings[eventType] === false || (eventType === 'provisioning_error' && settings['all_errors'] === false)) {
        console.log(`[WhatsApp] Notificação de administrador para '${eventType}' está desativada.`);
        return;
    }
    return sendWhatsAppMessage({
        to: adminPhone,
        message: `📢 *EQSAM - ALERTA ADMIN*\n\n${message}`,
        category: `admin_alert:${eventType}`
    });
}
/**
 * Testa a conexão e envia uma mensagem de teste
 */
export async function testWhatsAppConnection() {
    const { data: setting } = await supabaseAdmin
        .from("system_settings")
        .select("value")
        .eq("key", "whatsapp_admin_phone")
        .maybeSingle();
    const adminPhone = setting?.value?.toString();
    if (!adminPhone) {
        return { success: false, message: "Telefone do administrador não configurado. Preencha e salve antes de testar." };
    }
    const result = await sendWhatsAppMessage({
        to: adminPhone,
        message: "🧪 *Teste de Conexão Eqsam*\n\nSua integração com WhatsApp via Evolution API v2 está funcionando corretamente!",
        category: "test_connection"
    });
    if (!result.success) {
        const reasonMap = {
            disabled: "A integração está desativada. Ative e salve as configurações antes de testar.",
            incomplete_config: "Configurações incompletas: preencha URL, Nome da Instância e Token, e salve antes de testar.",
        };
        let message = result.reason ? reasonMap[result.reason] : undefined;
        if (!message) {
            const err = result.error;
            if (typeof err === "string" && err.trim()) {
                message = err;
            }
            else if (err && typeof err === "object") {
                message =
                    err.message ||
                        err.error ||
                        err.text ||
                        (Array.isArray(err.response?.message) ? err.response.message.join(", ") : err.response?.message) ||
                        JSON.stringify(err);
            }
        }
        return {
            success: false,
            message: message && message !== "{}" ? message : "Falha ao contatar a Evolution API v2. Verifique URL, instância e token.",
        };
    }
    return { success: true, message: `Mensagem de teste enviada para ${adminPhone}.` };
}
