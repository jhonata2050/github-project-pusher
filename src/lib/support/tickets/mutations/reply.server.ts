import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      ticketId: z.string(),
      message: z.string().min(1),
      attachments: z.array(z.string()).optional()
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });

    const { data: replierProfile } = await context.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .single();

    const { data, error } = await context.supabase
      .from("ticket_messages")
      .insert({
        ticket_id: input.ticketId,
        user_id: context.userId,
        message: input.message,
        attachments: input.attachments || [],
        is_staff: isAdmin || false
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const { data: ticket } = await context.supabase
      .from("tickets")
      .update({ 
        status: isAdmin ? "answered" : "customer-reply",
        updated_at: new Date().toISOString()
      })
      .eq("id", input.ticketId)
      .select("subject, user_id")
      .single();

    if (ticket && (ticket as any).user_id) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", (ticket as any).user_id)
        .maybeSingle();
      (ticket as any).profiles = p;
    }

    // Criar notificação no sistema
    if (ticket) {
      const notificationUserId = isAdmin ? (ticket as any).user_id : null; // Se admin respondeu, notifica o cliente
      
      if (isAdmin && notificationUserId) {
        try {
          await supabaseAdmin
            .from("audit_logs")
            .insert({
              user_id: notificationUserId,
              action: "ticket.answered",
              entity_type: "ticket",
              entity_id: input.ticketId,
              description: `Ticket "${ticket.subject}" respondido pela equipe`,
              metadata: {
                title: "Ticket Respondido",
                link: `/tickets/${input.ticketId}`,
              }
            });
        } catch (notifErr) {
          console.warn("[support] Falha ao registrar notificação/audit:", notifErr);
        }
      }
    }

    // Notificar via WhatsApp sobre nova resposta
    try {
      const { notifyAdminWhatsApp, sendWhatsAppMessage } = await import("../../../whatsapp.server");
      
      const clientName = (ticket as any)?.profiles?.full_name || "Cliente";
      const clientEmail = (ticket as any)?.profiles?.email || "N/A";
      const replierName = isAdmin ? "Equipe de suporte Eqsam" : (replierProfile?.full_name || "Cliente");
      const now = new Date().toLocaleString("pt-BR");

      // Notificar Admin se for resposta de cliente
      if (!isAdmin) {
        const adminMsg = [
          "📬 *Resposta em Ticket*",
          "",
          `*ID:* #${input.ticketId.slice(0, 8)}`,
          `*Assunto:* ${ticket?.subject}`,
          `*De:* ${replierName}`,
          `*Data/Hora:* ${now}`,
          "",
          `*Cliente:* ${clientName}`,
          `*E-mail:* ${clientEmail}`,
          "",
          `*Mensagem:* ${input.message.slice(0, 150)}${input.message.length > 150 ? "..." : ""}`
        ].join("\n");
        await notifyAdminWhatsApp(adminMsg, "ticket_events");
      } 
      // Notificar Cliente se for resposta de admin
      else {
        const { data: clientProfile } = await supabaseAdmin
          .from("profiles")
          .select("phone")
          .eq("id", (ticket as any).user_id)
          .single();

        if (clientProfile?.phone) {
          const clientMsg = [
            "✅ *Seu Ticket foi Respondido!*",
            "",
            `Olá, *${clientName}*!`,
            `Seu ticket *#${input.ticketId.slice(0, 8)} - ${ticket?.subject}* acaba de receber uma resposta da nossa equipe técnica.`,
            "",
            "Para visualizar a resposta e continuar o atendimento, acesse seu painel:",
            `🔗 https://eqsam.com/tickets/${input.ticketId}`,
            "",
            "_Eqsam Cloud - Excelência em Hospedagem_"
          ].join("\n");
          
          await sendWhatsAppMessage({
            to: clientProfile.phone,
            message: clientMsg,
            category: "ticket_reply"
          });
        }
      }
    } catch (e) {
      console.warn("[WhatsApp] Falha ao enviar notificação:", e);
    }

    return data;
  });
