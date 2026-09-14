import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      subject: z.string().min(3),
      message: z.string().min(10),
      priority: z.enum(["low", "medium", "high"]).default("medium")
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: ticket, error: ticketError } = await context.supabase
      .from("tickets")
      .insert({
        user_id: context.userId,
        subject: input.subject,
        priority: input.priority,
        status: "open"
      })
      .select()
      .single();

    if (ticketError) throw new Error(ticketError.message);

    const { error: messageError } = await context.supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticket.id,
        user_id: context.userId,
        message: input.message,
        is_staff: false
      });

    if (messageError) throw new Error(messageError.message);

    // Notificar Admin via WhatsApp sobre novo ticket
    try {
      const { notifyAdminWhatsApp } = await import("../../whatsapp.server");
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", context.userId)
        .single();
      
      const priorityMap = { low: "Baixa", medium: "Média", high: "Alta" };
      const now = new Date().toLocaleString("pt-BR");
      
      const whatsappMsg = [
        "🆕 *Novo Ticket Aberto*",
        "",
        `*ID:* #${ticket.id.slice(0, 8)}`,
        `*Assunto:* ${input.subject}`,
        `*Urgência:* ${priorityMap[input.priority as keyof typeof priorityMap]}`,
        `*Status:* Aberto`,
        `*Data/Hora:* ${now}`,
        "",
        `*Cliente:* ${profile?.full_name || "Desconhecido"}`,
        `*E-mail:* ${profile?.email || "N/A"}`,
        "",
        `*Mensagem:* ${input.message.slice(0, 150)}${input.message.length > 150 ? "..." : ""}`
      ].join("\n");

      await notifyAdminWhatsApp(whatsappMsg, "ticket_events");
    } catch (e) {
      console.warn("[WhatsApp] Falha ao notificar admin sobre novo ticket:", e);
    }

    return ticket;
  });

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
      const { notifyAdminWhatsApp, sendWhatsAppMessage } = await import("../../whatsapp.server");
      
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

export const updateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      ticketId: z.string(),
      status: z.enum([
        "open",
        "answered",
        "customer-reply",
        "in_progress",
        "on_hold",
        "closed"
      ]),
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    const { data: ticket, error: tErr } = await context.supabase
      .from("tickets")
      .select("*")
      .eq("id", input.ticketId)
      .single();

    if (tErr || !ticket) throw new Error("Ticket não encontrado");

    if (ticket && ticket.user_id) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("id", ticket.user_id)
        .maybeSingle();
      (ticket as any).profiles = p;
    }

    if (!isAdmin && ticket.user_id !== context.userId) {
      throw new Error("Acesso negado: Você não possui permissão para este ticket.");
    }

    if (!isAdmin && input.status !== "closed" && input.status !== "open") {
      throw new Error("Apenas administradores podem definir este status.");
    }

    const { error: updateErr } = await context.supabase
      .from("tickets")
      .update({
        status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.ticketId);

    if (updateErr) throw new Error(updateErr.message);

    const STATUS_TEXTS: Record<string, string> = {
      open: "Ticket reaberto",
      answered: "Ticket marcado como respondido",
      "customer-reply": "Ticket marcado como aguardando cliente",
      in_progress: "Ticket colocado em análise técnica",
      on_hold: "Ticket colocado em verificação",
      closed: "Ticket fechado e concluído"
    };

    await context.supabase.from("ticket_messages").insert({
      ticket_id: input.ticketId,
      user_id: context.userId,
      message: `ℹ️ [Sistema] ${STATUS_TEXTS[input.status] || `Status alterado para ${input.status}`}.`,
      is_staff: true,
      attachments: []
    });

    if (isAdmin && (input.status === "closed" || input.status === "in_progress" || input.status === "on_hold")) {
      const client = (ticket as any)?.profiles;
      if (client?.phone) {
        try {
          const { sendWhatsAppMessage } = await import("../../whatsapp.server");
          let msg = "";
          if (input.status === "closed") {
            msg = `🔒 *Ticket Finalizado*\n\nOlá ${client.full_name},\nSeu chamado *#${input.ticketId.slice(0, 8)} - ${ticket.subject}* foi marcado como *Resolvido / Fechado*.\n\nCaso ainda precise de suporte, você pode reabri-lo no painel.`;
          } else if (input.status === "in_progress") {
            msg = `⚙️ *Ticket em Análise*\n\nOlá ${client.full_name},\nSeu chamado *#${input.ticketId.slice(0, 8)} - ${ticket.subject}* está sendo analisado pela nossa equipe técnica especializada.`;
          } else if (input.status === "on_hold") {
            msg = `⏳ *Ticket em Verificação*\n\nOlá ${client.full_name},\nSeu chamado *#${input.ticketId.slice(0, 8)} - ${ticket.subject}* está em verificação interna/datacenter. Retornaremos em breve.`;
          }
          if (msg) {
            await sendWhatsAppMessage({ to: client.phone, message: msg, category: "ticket_status" });
          }
        } catch (e) {
          console.warn("[WhatsApp] Falha ao notificar mudança de status:", e);
        }
      }
    }

    return { success: true, status: input.status };
  });
