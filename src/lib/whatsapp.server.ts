import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Interface para a Evolution Go API
 */
interface EvolutionGoPayload {
  number: string;
  text: string;
  delay?: number;
  linkPreview?: boolean;
}

/**
 * Função centralizada para enviar mensagens via Evolution Go
 */
export async function sendWhatsAppMessage({
  to,
  message,
  category = "system",
}: {
  to: string;
  message: string;
  category?: string;
}) {
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

    const config: Record<string, any> = {};
    settings?.forEach((s: any) => {
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
      console.warn("[WhatsApp] Configurações da Evolution Go incompletas.");
      return { success: false, reason: "incomplete_config" };
    }

    // 2. Limpar número (deve ser apenas dígitos com DDI)
    const cleanNumber = to.replace(/\D/g, "");
    
    // TENTATIVA: Evolução Go (API Centralizada ou Host próprio)
    // Diagnóstico da API Evolution
    const endpoints = [
      { name: "v1/Go (path)", url: `${evolutionUrl}/message/sendText/${instance}`, method: "POST", body: { number: cleanNumber, text: message, linkPreview: true } },
      { name: "v2 (central)", url: `${evolutionUrl}/message/sendText`, method: "POST", body: { number: cleanNumber, text: message, instance: instance, linkPreview: true } },
      { name: "v2 (options)", url: `${evolutionUrl}/message/sendText`, method: "POST", body: { number: cleanNumber, text: message, options: { instance: instance }, linkPreview: true } },
      { name: "Simple GET", url: `${evolutionUrl}/instance/fetchInstances`, method: "GET" }
    ];
    
    let allAttempts: any[] = [];
    let finalResponse = null;

    for (const item of endpoints) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
            "apikey": token
          },
          ...(item.body ? { body: JSON.stringify(item.body) } : {})
        });
        
        const text = await response.text();
        const attempt = { 
          name: item.name, 
          url: item.url.replace(token, "HIDDEN"), 
          status: response.status, 
          text: text.slice(0, 500) 
        };
        allAttempts.push(attempt);

        if (response.ok) {
          finalResponse = { ok: true, status: response.status, text };
          break;
        }
      } catch (e: any) {
        allAttempts.push({ name: item.name, url: item.url.replace(token, "HIDDEN"), error: e.message });
      }
    }

    if (!finalResponse) {
      console.error("[WhatsApp] Falha em todos os endpoints:", allAttempts);
      
      await supabaseAdmin.from("audit_logs").insert({
        category: "whatsapp",
        action: "whatsapp.send_failed",
        status: "failure",
        description: `Falha na API (${evolutionUrl}). Status: ${allAttempts.map(a => `${a.name}: ${a.status || 'ERR'}`).join(', ')}`,
        metadata: { to, category, attempts: allAttempts } as any
      });
      
      const detailedError = allAttempts.find(a => a.status === 404) 
        ? "Endpoint não encontrado (404). Verifique se a URL da API está correta (incluindo /v1 ou /v2 se necessário)."
        : JSON.stringify(allAttempts);

      return { success: false, error: detailedError };
    }

    let result = {};
    try {
      result = JSON.parse(finalResponse.text);
    } catch (e) {
      result = { raw: finalResponse.text };
    }




    // 4. Log de sucesso na auditoria
    await supabaseAdmin.from("audit_logs").insert({
      category: "whatsapp",
      action: "whatsapp.sent",
      status: "success",
      description: `Mensagem enviada com sucesso para ${to}`,
      metadata: { to, category } as any
    });

    return { success: true, data: result };

  } catch (error: any) {
    console.error("[WhatsApp] Exceção ao enviar mensagem:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Notifica o administrador sobre eventos críticos
 */
export async function notifyAdminWhatsApp(message: string, eventType: string) {
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

  const settings = (notifySettings?.value as any) || {};
  
  if (settings[eventType] === false) {
    console.log(`[WhatsApp] Notificação de administrador para '${eventType}' está desativada.`);
    return;
  }

  return sendWhatsAppMessage({
    to: adminPhone,
    message: `📢 *ALERTA ADMIN*\n\n${message}`,
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
    message: "🧪 *Teste de Conexão HostPanel*\n\nSua integração com WhatsApp via Evolution Go está funcionando corretamente!",
    category: "test_connection"
  });

  if (!result.success) {
    const reasonMap: Record<string, string> = {
      disabled: "A integração está desativada. Ative e salve as configurações antes de testar.",
      incomplete_config: "Configurações incompletas: preencha URL, Nome da Instância e Token, e salve antes de testar.",
    };

    let message = result.reason ? reasonMap[result.reason] : undefined;

    if (!message) {
      const err: any = result.error;
      if (typeof err === "string" && err.trim()) {
        message = err;
      } else if (err && typeof err === "object") {
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
      message: message && message !== "{}" ? message : "Falha ao contatar a Evolution Go. Verifique URL, instância e token.",
    };
  }

  return { success: true, message: `Mensagem de teste enviada para ${adminPhone}.` };
}
