import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
