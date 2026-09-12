import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const getTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => 
    z.object({
      limit: z.number().default(20),
      offset: z.number().default(0),
      status: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });

    let query = context.supabase
      .from("tickets")
      .select(`*`, { count: 'exact' });

    if (!isAdmin) {
      query = query.eq("user_id", context.userId);
    }

    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    const { data: tickets, count, error } = await query
      .order("updated_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (error) throw new Error(error.message);

    if (tickets && tickets.length > 0) {
      const userIds = Array.from(new Set(tickets.map((t: any) => t.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profiles } = await context.supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        tickets.forEach((t: any) => {
          t.profile = pMap.get(t.user_id) || null;
        });
      }
    }

    return { tickets: tickets || [], count: count || 0 };
  });

export const getTicketDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: ticketId, context }) => {
    // SECURITY: If not admin, verify ownership of the ticket
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    const { data: ticket, error: ticketError } = await context.supabase
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError) throw new Error(ticketError.message);

    // If not admin, the ticket must belong to the user
    if (!isAdmin && ticket.user_id !== context.userId) {
      throw new Error("Acesso negado: Você não possui permissão para acessar este ticket.");
    }

    if (ticket && ticket.user_id) {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", ticket.user_id)
        .maybeSingle();
      (ticket as any).profile = profile;
    }

    const { data: messages, error: messagesError } = await context.supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (messagesError) throw new Error(messagesError.message);

    if (messages && messages.length > 0) {
      const msgUserIds = Array.from(new Set(messages.map((m: any) => m.user_id).filter(Boolean)));
      if (msgUserIds.length > 0) {
        const { data: profiles } = await context.supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", msgUserIds);
        const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        messages.forEach((m: any) => {
          m.profile = pMap.get(m.user_id) || null;
        });
      }
    }

    return { ticket, messages };
  });

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
      const { notifyAdminWhatsApp } = await import("../whatsapp.server");
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
      
      // Se cliente respondeu, poderíamos notificar os admins, mas vamos focar no requisito de notificar o cliente
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
      const { notifyAdminWhatsApp, sendWhatsAppMessage } = await import("../whatsapp.server");
      
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
          const { sendWhatsAppMessage } = await import("../whatsapp.server");
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

