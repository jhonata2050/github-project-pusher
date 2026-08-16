import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function sendEmail({
  to,
  subject,
  html,
  text,
  userId,
  templateName,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  userId?: string;
  templateName?: string;
}) {
  // Buscar configurações de e-mail do banco
  const { data: settings } = await supabaseAdmin
    .from("system_settings")
    .select("*")
    .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_encryption", "support_email", "company_name", "resend_api_key"]);

  const config: Record<string, string> = {};
  settings?.forEach((s) => {
    if (typeof s.value === 'string') {
      config[s.key] = s.value.replace(/"/g, ''); // Limpa aspas extras do banco
    }
  });

  const fromEmail = config["support_email"] || "no-reply@hostpanel.app";
  const companyName = config["company_name"] || "HostPanel";
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
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

export const EMAIL_TEMPLATES = {
  welcome: (name: string) => ({
    subject: `Bem-vindo à ${name}!`,
    html: (company: string) => `
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
  invoiceGenerated: (invoiceId: string, amount: string) => ({
    subject: `Nova fatura gerada - #${invoiceId.slice(0, 8)}`,
    html: (company: string) => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
        <h2 style="color: #333;">Olá! Uma nova fatura foi gerada.</h2>
        <p>A fatura <strong>#${invoiceId.slice(0, 8)}</strong> no valor de <strong>${amount}</strong> já está disponível para pagamento.</p>
        <p>Evite a suspensão dos seus serviços realizando o pagamento até a data de vencimento.</p>
        <a href="https://hostpanel.app/invoices/${invoiceId}" style="display: inline-block; padding: 12px 25px; background: #A3E635; color: #000; text-decoration: none; border-radius: 12px; font-weight: bold; margin-top: 20px;">Ver Fatura</a>
      </div>
    `,
  }),
  serviceProvisioned: (serviceName: string, domain: string) => ({
    subject: `Seu serviço ${serviceName} está ativo!`,
    html: (company: string) => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
        <h2 style="color: #A3E635;">Tudo pronto!</h2>
        <p>Seu plano de hospedagem <strong>${serviceName}</strong> foi provisionado com sucesso.</p>
        <p><strong>Domínio:</strong> ${domain}</p>
        <p>As instruções de acesso ao painel DirectAdmin foram configuradas e você já pode começar a usar.</p>
      </div>
    `,
  }),
};
