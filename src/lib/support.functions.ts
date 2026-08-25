import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const testWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { testWhatsAppConnection } = await import("./whatsapp.server");
    return testWhatsAppConnection();
  });


export const getSystemSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("*");

    if (error) throw new Error(error.message);

    const settings: Record<string, any> = {};
    data.forEach((s: any) => {
      // Garantir que valores vazios no banco não quebrem a lógica do frontend
      settings[s.key] = (s.value === "" || s.value === null) ? null : s.value;
    });

    return settings;
  });


export const updateSystemSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.record(z.any()).parse(data))
  .handler(async ({ data: settings, context }) => {
    // Verificar se é admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    for (const [key, value] of Object.entries(settings)) {
      // Normalização: se o valor for apenas espaços, tratamos como vazio
      const normalizedValue = typeof value === "string" ? value.trim() : value;

      if (normalizedValue === "" || normalizedValue === null || normalizedValue === undefined) {
        // Log para auditoria
        console.log(`[SystemSettings] Deleting empty key: ${key}`);
        await supabaseAdmin
          .from("system_settings")
          .delete()
          .eq("key", key);
        continue;
      }

      const { error } = await supabaseAdmin
        .from("system_settings")
        .upsert({ key, value: normalizedValue }, { onConflict: 'key' });
      
      if (error) {
        console.error(`[SystemSettings] Error updating ${key}:`, error);
        throw new Error(`Error updating ${key}: ${error.message}`);
      }
    }

    return { success: true };
  });

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
      .select(`
        *,
        profile:profiles(full_name, email)
      `, { count: 'exact' });

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
      .select(`
        *,
        profile:profiles(full_name, email)
      `)
      .eq("id", ticketId)
      .single();

    if (ticketError) throw new Error(ticketError.message);

    // If not admin, the ticket must belong to the user
    if (!isAdmin && ticket.user_id !== context.userId) {
      throw new Error("Acesso negado: Você não possui permissão para acessar este ticket.");
    }

    const { data: messages, error: messagesError } = await context.supabase
      .from("ticket_messages")
      .select(`
        *,
        profile:profiles(full_name)
      `)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (messagesError) throw new Error(messagesError.message);

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
      const { notifyAdminWhatsApp } = await import("./whatsapp.server");
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
      .select("subject, user_id, profiles(full_name, email)")
      .single();

    // Criar notificação no sistema
    if (ticket) {
      const notificationUserId = isAdmin ? (ticket as any).user_id : null; // Se admin respondeu, notifica o cliente
      
      // Se cliente respondeu, poderíamos notificar os admins, mas vamos focar no requisito de notificar o cliente
      if (isAdmin && notificationUserId) {
        await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: notificationUserId,
            title: "Ticket Respondido",
            message: `Seu ticket "${ticket.subject}" recebeu uma nova resposta da nossa equipe.`,
            link: `/tickets/${input.ticketId}`
          });
      }
    }

    // Notificar via WhatsApp sobre nova resposta
    try {
      const { notifyAdminWhatsApp, sendWhatsAppMessage } = await import("./whatsapp.server");
      
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
      .select("*, profiles(*)")
      .eq("id", input.ticketId)
      .single();

    if (tErr || !ticket) throw new Error("Ticket não encontrado");

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
          const { sendWhatsAppMessage } = await import("./whatsapp.server");
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

export const getServers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // SECURITY: Only admins can list servers
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin) {
      throw new Error("Acesso negado: Apenas administradores podem listar servidores.");
    }

    const { data, error } = await context.supabase
      .from("servers")
      .select("*");

    if (error) {
      console.warn("[getServers] Erro ao consultar servers:", error.message);
      return [];
    }
    return (data ?? []) as Database["public"]["Tables"]["servers"]["Row"][];
  });

export const createServerDA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      name: z.string(),
      hostname: z.string(),
      ip_address: z.string().optional(),
      api_user: z.string(),
      api_token: z.string(),
      max_accounts: z.number().default(100)
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    // Verify admin role explicitly
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized: Only admins can create servers.");

    const { data, error } = await context.supabase
      .from("servers")
      .insert({
        hostname: input.hostname,
        ip_address: input.ip_address ?? null,
        api_user: input.api_user,
        api_token: input.api_token || "",
        max_accounts: input.max_accounts
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const updateServerDA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      id: z.string(),
      name: z.string(),
      hostname: z.string(),
      ip_address: z.string().optional(),
      api_user: z.string(),
      api_token: z.string().optional(),
      max_accounts: z.number().default(100),
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const patch = {
      hostname: input.hostname,
      ip_address: input.ip_address ?? null,
      api_user: input.api_user,
      max_accounts: input.max_accounts,
      ...(input.api_token && input.api_token.length > 0 ? { api_token: input.api_token } : {}),
    } as any;

    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized: Only admins can update servers.");

    const { data, error } = await context.supabase
      .from("servers")
      .update(patch)
      .eq("id", input.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const deleteServerDA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: serverId, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized: Only admins can delete servers.");

    const { error } = await context.supabase.from("servers").delete().eq("id", serverId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const testDAConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: serverId, context }) => {
    // SECURITY: Only admins can test connections
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin) {
      throw new Error("Acesso negado: Apenas administradores podem testar conexões.");
    }

    const { testDAConnectionDetails } = await import("./directadmin.server");
    return testDAConnectionDetails(serverId);
  });


export const getAllProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data, error } = await context.supabase
      .from("products")
      .select("id, name")
      .order("name");

    if (error) {
      console.warn("[getAllProducts] Warning:", error.message);
      return [];
    }
    return data ?? [];
  });

export const getDAPackagesList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: serverId, context }) => {
    // SECURITY: Only admins can list packages
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin) {
      throw new Error("Acesso negado: Apenas administradores podem listar pacotes.");
    }

    const { getDAPackages } = await import("./directadmin.server");
    return await getDAPackages(serverId);
  });

export const getDACapabilitiesList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: serverId, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { getDACapabilities } = await import("./directadmin.server");
    return await getDACapabilities(serverId);
  });

export const getDASSOUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({ 
      serverId: z.string(), 
      username: z.string(),
      redirectUrl: z.string().optional() 
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    // SECURITY: Validate request and check for administrative escalation
    const { validateDASSORequest } = await import("./security.server");
    const { targetUsername } = await validateDASSORequest(context.userId, data.username, data.serverId);

    const { getHostingProvider } = await import("./hosting-provider-factory.server");
    const provider = await getHostingProvider(data.serverId);
    return await provider.generateClientLogin(targetUsername, data.redirectUrl);
  });




export const getServiceServerDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: serviceId, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: service, error } = await supabaseAdmin
      .from("services")
      .select(`
        id, user_id, product_id, order_id, server_id, status, domain, 
        billing_cycle, next_due_date, suspension_reason, username, password, 
        whmcs_id, vps_hostname, vps_os_template, vps_region, notes, created_at, updated_at,
        products(id, name, product_type),
        servers(id, name, hostname, ip_address)
      `)
      .eq("id", serviceId)
      .maybeSingle();

    if (error || !service) throw new Error("Serviço não encontrado");

    // If not admin, the service must belong to the user
    if (!isAdmin && service.user_id !== context.userId) {
      throw new Error("Acesso negado: Você não possui permissão para acessar este serviço.");
    }

    // Buscar VPS vinculada
    const { data: vpsList } = await supabaseAdmin
      .from("vps_instances")
      .select("id, user_id, external_id, name, ip_address, status, region, os_template")
      .eq("user_id", service.user_id);

    const matchedVps = (vpsList || []).filter((v: any) => 
      (service.domain && (service.domain === v.name || service.domain === v.ip_address)) ||
      (service.vps_hostname && service.vps_hostname === v.name) ||
      service.products?.product_type === 'vps'
    );

    return {
      ...service,
      vps_instances: matchedVps,
    };
  });


export const getProductGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Public routes use this, but authenticated ones also do.
    // If it's a security risk to list all groups to any client, we should restrict.
    // However, product groups are usually public.
    const { data, error } = await context.supabase
      .from("product_groups")
      .select("*")
      .order("sort_order");

    if (error) throw new Error(error.message);
    return data;
  });

export const createProductGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      name: z.string().min(1),
      description: z.string().nullable(),
      sort_order: z.number().default(0),
      is_visible: z.boolean().default(true)
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
      .from("product_groups")
      .insert({
        name: input.name,
        slug: input.name.toLowerCase().replace(/\s+/g, '-'),
        description: input.description,
        sort_order: input.sort_order,
        is_visible: input.is_visible
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const updateProductGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().nullable(),
      sort_order: z.number(),
      is_visible: z.boolean()
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
      .from("product_groups")
      .update({
        name: input.name,
        slug: input.name.toLowerCase().replace(/\s+/g, '-'),
        description: input.description,
        sort_order: input.sort_order,
        is_visible: input.is_visible
      })
      .eq("id", input.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const deleteProductGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().uuid().parse(data))
  .handler(async ({ data: groupId, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    // Verificar se há produtos no grupo
    const { count, error: countError } = await context.supabase
      .from("products")
      .select("id", { count: 'exact', head: true })
      .eq("group_id", groupId);

    if (countError) throw new Error(countError.message);
    if (count && count > 0) {
      throw new Error("Não é possível excluir um grupo que contém produtos.");
    }

    const { error } = await supabaseAdmin
      .from("product_groups")
      .delete()
      .eq("id", groupId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      name: z.string(),
      slug: z.string(),
      group_id: z.string().uuid(),
      description: z.string().nullable(),
      product_type: z.string().default("hosting"),
      directadmin_package: z.string().nullable(),
      external_id: z.string().nullable(),
      is_visible: z.boolean().default(true),
      sort_order: z.number().default(0),
      disk_quota_mb: z.number().nullable().optional(),
      immediate_purchase: z.boolean().optional(),
      prices: z.array(z.object({
        cycle: z.enum(["monthly", "quarterly", "semiannually", "annually", "biennially"]),
        price: z.number(),
        is_active: z.boolean()
      }))
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data: product, error: prodError } = await context.supabase
      .from("products")
      .insert({
        name: input.name,
        slug: input.slug,
        group_id: input.group_id,
        description: input.description,
        product_type: input.product_type,
        directadmin_package: input.directadmin_package || null,
        external_id: input.external_id || null,
        is_visible: input.is_visible,
        sort_order: input.sort_order,
        disk_quota_mb: input.disk_quota_mb || null,
        immediate_purchase: input.immediate_purchase || false,
        setup_fee: 0,
        auto_provision: true,
        is_featured: false
      })
      .select()
      .single();

    if (prodError) throw new Error(prodError.message);

    const pricesToInsert = input.prices.map((p: any) => ({
      product_id: product.id,
      cycle: p.cycle,
      price: p.price,
      is_active: p.is_active,
      currency: 'BRL'
    }));

    const { error: priceError } = await context.supabase
      .from("product_prices")
      .insert(pricesToInsert);

    if (priceError) throw new Error(priceError.message);

    return product;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      id: z.string(),
      name: z.string(),
      group_id: z.string().uuid(),
      product_type: z.string(),
      description: z.string().nullable(),
      directadmin_package: z.string().nullable(),
      external_id: z.string().nullable(),
      is_visible: z.boolean(),
      sort_order: z.number(),
      disk_quota_mb: z.number().nullable(),
      immediate_purchase: z.boolean().optional(),
      prices: z.array(z.object({
        cycle: z.enum(["monthly", "quarterly", "semiannually", "annually", "biennially"]),
        price: z.number(),
        is_active: z.boolean()
      }))
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { error: prodError } = await context.supabase
      .from("products")
      .update({
        name: input.name,
        group_id: input.group_id,
        product_type: input.product_type,
        description: input.description,
        directadmin_package: input.directadmin_package || null,
        external_id: input.external_id || null,
        is_visible: input.is_visible,
        sort_order: input.sort_order,
        disk_quota_mb: input.disk_quota_mb,
        immediate_purchase: input.immediate_purchase || false
      })
      .eq("id", input.id);

    if (prodError) throw new Error(prodError.message);

    // Update prices - delete and re-insert for simplicity in this turn
    await context.supabase
      .from("product_prices")
      .delete()
      .eq("product_id", input.id);

    const pricesToInsert = input.prices.map((p: any) => ({
      product_id: input.id,
      cycle: p.cycle,
      price: p.price,
      is_active: p.is_active
    }));

    const { error: priceError } = await context.supabase
      .from("product_prices")
      .insert(pricesToInsert);

    if (priceError) throw new Error(priceError.message);

    return { success: true, id: input.id };
  });

export const updateServiceDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      serviceId: z.string().uuid(),
      username: z.string().nullable().optional(),
      domain: z.string().nullable().optional(),
      server_id: z.string().uuid().nullable().optional(),
      product_id: z.string().uuid().nullable().optional(),
      next_due_date: z.string().nullable().optional(),
      status: z.enum(["active", "pending", "suspended", "terminated", "cancelled"]).nullable().optional(),
      password: z.string().nullable().optional(),
      vps_instance_id: z.string().nullable().optional(),
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Buscar serviço atual
    const { data: currentService, error: curErr } = await supabaseAdmin
      .from("services")
      .select("id, user_id, product_id, domain")
      .eq("id", input.serviceId)
      .single();

    if (curErr || !currentService) throw new Error("Serviço não encontrado.");

    const updatePayload: any = {};
    if (input.username !== undefined) updatePayload.username = input.username;
    if (input.domain !== undefined) updatePayload.domain = input.domain;
    if (input.server_id !== undefined) updatePayload.server_id = input.server_id;
    if (input.product_id !== undefined) updatePayload.product_id = input.product_id;
    if (input.next_due_date !== undefined) updatePayload.next_due_date = input.next_due_date;
    if (input.status !== undefined && input.status !== null) updatePayload.status = input.status;
    if (input.password !== undefined) updatePayload.password = input.password;

    const { error } = await supabaseAdmin
      .from("services")
      .update(updatePayload)
      .eq("id", input.serviceId);
      
    if (error) throw new Error(`Erro ao atualizar serviço: ${error.message}`);

    // Se houver vinculação de VPS, atualizar o proprietário e os dados técnicos
    if (input.vps_instance_id && input.vps_instance_id !== 'none') {
      const { data: vps } = await supabaseAdmin
        .from("vps_instances")
        .select("id, name, ip_address, region, os_template, external_id")
        .eq("id", input.vps_instance_id)
        .maybeSingle();

      if (vps) {
        // Atribuir o dono da VPS ao cliente do serviço
        await supabaseAdmin
          .from("vps_instances")
          .update({ user_id: currentService.user_id, status: 'active' })
          .eq("id", vps.id);

        // Atualizar hostname e região no serviço
        await supabaseAdmin
          .from("services")
          .update({
            domain: input.domain || vps.name || vps.ip_address || currentService.domain,
            vps_hostname: vps.name || null,
            vps_region: vps.region || null,
            vps_os_template: vps.os_template || null,
          })
          .eq("id", input.serviceId);
      }
    }

    // Se o serviço foi ativado manualmente agora, disparar provisionamento
    if (input.status === "active") {
      try {
        const { processProvisioning } = await import("./finance.server");
        
        // Buscar a fatura pendente ou paga associada a este serviço para provisionar
        const { data: invoiceItem } = await supabaseAdmin
          .from("invoice_items")
          .select("invoice_id")
          .eq("service_id", input.serviceId)
          .limit(1)
          .maybeSingle();
        
        if (invoiceItem?.invoice_id) {
          console.log(`[Admin] Disparando provisionamento manual para fatura ${invoiceItem.invoice_id} após ativação do serviço ${input.serviceId}`);
          await processProvisioning(invoiceItem.invoice_id);
        }
      } catch (e) {
        console.error("[Admin] Erro ao disparar provisionamento automático após ativação manual:", e);
      }
    }

    return { success: true };
  });

export const hostingAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      serviceId: z.string().uuid(),
      action: z.enum(["suspend", "unsuspend", "delete"])
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // SECURITY: ALWAYS re-verify role directly
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data: service } = await supabaseAdmin
      .from("services")
      .select("id, username, server_id")
      .eq("id", input.serviceId)
      .single();

    if (!service || !service.server_id || !service.username) {
      throw new Error("Serviço incompleto ou sem servidor vinculado.");
    }

    const { getHostingProvider } = await import("./hosting-provider-factory.server");
    const provider = await getHostingProvider(service.server_id);

    switch (input.action) {
      case "suspend":
        await provider.suspendAccount(service.username);
        await supabaseAdmin.from("services").update({ status: "suspended" }).eq("id", service.id);
        break;
      case "unsuspend":
        await provider.unsuspendAccount(service.username);
        await supabaseAdmin.from("services").update({ status: "active" }).eq("id", service.id);
        break;
      case "delete":
        await provider.deleteAccount(service.username);
        await supabaseAdmin.from("services").update({ status: "terminated" }).eq("id", service.id);
        break;
    }

    return { success: true };
  });

export const adminCreateClientService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        clientId: z.string().uuid(),
        productId: z.string().uuid(),
        billingCycle: z.enum(["monthly", "quarterly", "semiannually", "annually", "biennially"]).default("monthly"),
        status: z.enum(["active", "pending", "suspended", "cancelled"]).default("active"),
        nextDueDate: z.string().optional().nullable(),
        generateInvoice: z.boolean().default(false),
        notes: z.string().optional().nullable(),
        // Hosting specific fields
        domain: z.string().optional().nullable(),
        serverId: z.string().uuid().optional().nullable(),
        username: z.string().optional().nullable(),
        password: z.string().optional().nullable(),
        provisionServer: z.boolean().default(false),
        // VPS specific fields
        vpsHostname: z.string().optional().nullable(),
        vpsInstanceId: z.string().optional().nullable(),
        vpsIpAddress: z.string().optional().nullable(),
        vpsExternalId: z.string().optional().nullable(),
        vpsOsTemplate: z.string().optional().nullable(),
        vpsRegion: z.string().optional().nullable(),
        vpsSshUser: z.string().optional().nullable(),
        vpsSshPort: z.number().optional().nullable(),
        vpsSshPassword: z.string().optional().nullable(),
      })
      .parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verificar se é admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");

    // Buscar produto
    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("*, product_prices(*)")
      .eq("id", input.productId)
      .single();

    if (pErr || !product) throw new Error("Produto não encontrado.");

    // Buscar perfil do cliente
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", input.clientId)
      .single();

    if (profErr || !profile) throw new Error("Cliente não encontrado.");

    let finalPassword = input.password || input.vpsSshPassword || "";
    let directAdminCreated = false;

    // 1. Provisionamento opcional no DirectAdmin se for hospedagem
    if (product.product_type === 'hosting' && input.provisionServer && input.serverId && input.username && input.domain) {
      try {
        const { createDAAccount } = await import("./directadmin.server");
        const daRes = await createDAAccount(input.serverId, {
          username: input.username,
          email: profile.email || "contato@eqsam.com",
          domain: input.domain,
          package: product.directadmin_package || "Default",
          password: input.password || undefined,
        });
        if (daRes?.daPassword) {
          finalPassword = daRes.daPassword;
        }
        directAdminCreated = true;
      } catch (daErr: any) {
        console.warn("[AdminAddService] Aviso no DirectAdmin:", daErr.message);
        throw new Error(`Falha ao criar conta no DirectAdmin: ${daErr.message}`);
      }
    }

    // 2. Criar serviço no banco de dados
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    const nextDue = input.nextDueDate || defaultDueDate.toISOString();

    const domainName = product.product_type === 'vps'
      ? (input.vpsHostname || input.domain || `vps-${profile.email?.split('@')[0] || 'instancia'}`)
      : (input.domain || "sem-dominio.com");

    const usernameVal = product.product_type === 'vps'
      ? (input.vpsSshUser || 'root')
      : (input.username || null);

    const { data: service, error: sErr } = await supabaseAdmin
      .from("services")
      .insert({
        user_id: input.clientId,
        product_id: input.productId,
        server_id: product.product_type === 'hosting' ? (input.serverId || null) : null,
        domain: domainName,
        username: usernameVal,
        password: finalPassword || null,
        billing_cycle: input.billingCycle,
        status: input.status,
        next_due_date: nextDue,
        notes: input.notes || (directAdminCreated ? "Hospedagem provisionada automaticamente no DirectAdmin." : product.product_type === 'vps' ? "Instância VPS vinculada/criada pelo administrador." : "Criado manualmente pelo administrador."),
      })
      .select()
      .single();

    if (sErr || !service) throw new Error(`Erro ao cadastrar serviço: ${sErr?.message}`);

    // 3. Se for produto VPS, gerenciar/vincular a linha na tabela vps_instances
    if (product.product_type === 'vps') {
      const vpsPayload: any = {
        service_id: service.id,
        user_id: input.clientId,
        external_id: input.vpsExternalId || input.vpsHostname || String(Date.now()),
        provider_id: input.vpsExternalId || null,
        name: input.vpsHostname || product.name || 'Servidor VPS',
        ip_address: input.vpsIpAddress || null,
        region: input.vpsRegion || 'US-east',
        os_template: input.vpsOsTemplate || 'Ubuntu',
        status: input.status === 'active' ? 'active' : 'pending',
        ssh_host: input.vpsIpAddress || null,
        ssh_port: input.vpsSshPort || 22,
        ssh_user: input.vpsSshUser || 'root',
        ssh_password: input.vpsSshPassword || null,
      };

      if (input.vpsInstanceId && input.vpsInstanceId !== 'new') {
        await supabaseAdmin
          .from('vps_instances')
          .update(vpsPayload)
          .eq('id', input.vpsInstanceId);
      } else {
        await supabaseAdmin
          .from('vps_instances')
          .upsert(vpsPayload, { onConflict: 'service_id' });
      }
    }

    // 4. Gerar fatura opcional
    if (input.generateInvoice) {
      try {
        const prices = product.product_prices || [];
        const matchedPriceObj = prices.find((p: any) => p.cycle === input.billingCycle && p.is_active !== false);
        const price = Number(matchedPriceObj?.price || 19.90);

        const { data: invoice } = await supabaseAdmin
          .from("invoices")
          .insert({
            user_id: input.clientId,
            total_amount: price,
            subtotal: price,
            discount_amount: 0,
            due_date: nextDue,
            status: input.status === "active" ? "paid" : "pending",
            payment_method: "manual",
            notes: `Fatura gerada manualmente para ${product.name} (${domainName})`,
          })
          .select()
          .single();

        if (invoice) {
          await supabaseAdmin.from("invoice_items").insert({
            invoice_id: invoice.id,
            service_id: service.id,
            description: `${product.name} - ${domainName} (${input.billingCycle.toUpperCase()})`,
            amount: price,
            quantity: 1,
          });
        }
      } catch (invErr: any) {
        console.warn("[AdminAddService] Aviso ao gerar fatura:", invErr.message);
      }
    }

    return { success: true, serviceId: service.id };
  });




