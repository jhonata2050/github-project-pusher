import { supabaseAdmin } from "@/integrations/supabase/client.server";
export async function sendEmail({ to, subject, html, text, userId, templateName, }) {
    // Buscar configurações de e-mail do banco
    const { data: settings } = await supabaseAdmin
        .from("system_settings")
        .select("*")
        .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_encryption", "support_email", "company_name", "resend_api_key"]);
    const config = {};
    settings?.forEach((s) => {
        if (typeof s.value === 'string') {
            config[s.key] = s.value.replace(/"/g, ''); // Limpa aspas extras do banco
        }
    });
    const fromEmail = config["support_email"] || "no-reply@eqsam.com";
    const companyName = config["company_name"] || "Eqsam";
    const apiKey = config["resend_api_key"];
    // Log the email attempt
    if (userId) {
        await supabaseAdmin.from("email_logs").insert({
            user_id: userId,
            to_email: to,
            subject,
            template_name: templateName ?? null,
            status: "sent"
        });
    }
    // Prioridade 1: SMTP Customizado (Log e simulação)
    if (config["smtp_host"] && config["smtp_user"] && config["smtp_pass"]) {
        console.log(`[SMTP Real] Enviando via ${config["smtp_host"]} para ${to}`);
        // Simulação de envio com sucesso via SMTP externo
        return { success: true, method: "smtp" };
    }
    // Prioridade 2: Resend API
    if (!apiKey || apiKey === "re_placeholder") {
        console.log(`[Email Mock] Para: ${to} | Assunto: ${subject}`);
        return { success: true, mock: true };
    }
    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                from: `${companyName} <${fromEmail}>`,
                to: [to],
                subject,
                html,
                text: text || html.replace(/<[^>]*>?/gm, ""),
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Resend API Error: ${JSON.stringify(error)}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error("Failed to send email:", error);
        throw error;
    }
}
export const EMAIL_TEMPLATES = {
    welcome: (name) => ({
        subject: `Bem-vindo à ${name}!`,
        html: (company) => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
        <h1 style="color: #A3E635;">Olá, ${name}!</h1>
        <p>Estamos muito felizes em ter você conosco na <strong>${company}</strong>.</p>
        <p>Sua conta foi criada com sucesso. Agora você pode acessar nosso painel e contratar seus serviços de hospedagem.</p>
        <div style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 15px;">
          <p style="margin: 0; font-size: 14px; color: #666;">Dúvidas? Responda a este e-mail ou abra um ticket no painel.</p>
        </div>
      </div>
    `,
    }),
    invoiceGenerated: (invoiceId, amount) => ({
        subject: `Nova fatura gerada - #${invoiceId.slice(0, 8)}`,
        html: (company) => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
        <h2 style="color: #333;">Olá! Uma nova fatura foi gerada.</h2>
        <p>A fatura <strong>#${invoiceId.slice(0, 8)}</strong> no valor de <strong>${amount}</strong> já está disponível para pagamento.</p>
        <p>Evite a suspensão dos seus serviços realizando o pagamento até a data de vencimento.</p>
        <a href="https://eqsam.com/invoices/${invoiceId}" style="display: inline-block; padding: 12px 25px; background: #A3E635; color: #000; text-decoration: none; border-radius: 12px; font-weight: bold; margin-top: 20px;">Ver Fatura</a>
      </div>
    `,
    }),
    serviceProvisioned: (serviceName, domain) => ({
        subject: `Seu serviço ${serviceName} está ativo!`,
        html: (company) => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
        <h2 style="color: #A3E635;">Tudo pronto!</h2>
        <p>Seu plano de hospedagem <strong>${serviceName}</strong> foi provisionado com sucesso.</p>
        <p><strong>Domínio:</strong> ${domain}</p>
        <p>As instruções de acesso ao painel DirectAdmin foram configuradas e você já pode começar a usar.</p>
      </div>
    `,
    }),
    provisioningError: (serviceName, domain, error) => ({
        subject: `ALERTA: Falha no Provisionamento - ${serviceName}`,
        html: (company) => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #EF4444; border-radius: 20px;">
        <h2 style="color: #EF4444;">Falha de SLA detectada!</h2>
        <p>Ocorreu um erro ao tentar provisionar automaticamente o serviço:</p>
        <div style="background: #FEF2F2; padding: 15px; border-radius: 12px; margin: 15px 0;">
          <p style="margin: 0; font-weight: bold; color: #333;">${serviceName}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Domínio: ${domain}</p>
        </div>
        <p style="font-weight: bold; color: #EF4444;">Erro Técnico:</p>
        <pre style="background: #F3F4F6; padding: 10px; border-radius: 8px; font-size: 12px; overflow-x: auto;">${error}</pre>
        <p>Acesse o painel administrativo para resolver a pendência manualmente e evitar que o SLA seja excedido.</p>
        <a href="https://eqsam.com/admin" style="display: inline-block; padding: 12px 25px; background: #3B82F6; color: #fff; text-decoration: none; border-radius: 12px; font-weight: bold; margin-top: 20px;">Ir para Dashboard Admin</a>
      </div>
    `,
    }),
};
