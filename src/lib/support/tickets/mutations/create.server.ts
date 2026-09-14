import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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
      const { notifyAdminWhatsApp } = await import("../../../whatsapp.server");
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
