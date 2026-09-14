import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
          const { sendWhatsAppMessage } = await import("../../../whatsapp.server");
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
