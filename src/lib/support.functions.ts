import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      offset: z.number().default(0)
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });

    let query = context.supabase
      .from("tickets")
      .select("*", { count: 'exact' });

    if (!isAdmin) {
      query = query.eq("user_id", context.userId);
    }

    const { data: tickets, count, error } = await query
      .select(`
        *,
        profile:profiles(full_name)
      `)
      .order("updated_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (error) throw new Error(error.message);
    return { tickets, count: count || 0 };
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

    const { data, error } = await supabaseAdmin
      .from("servers")
      .select("id, hostname, ip_address, api_user, server_type, is_active, max_accounts, created_at");

    if (error) throw new Error(error.message);
    return data;
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

    const { data, error } = await supabaseAdmin
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

    const { data, error } = await supabaseAdmin
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

    const { error } = await supabaseAdmin.from("servers").delete().eq("id", serverId);
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
    try {
      return await testDAConnectionDetails(serverId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      throw new Error(`Falha na conexão: ${message}`);
    }
  });


export const getAllProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, name")
      .order("name");

    if (error) throw new Error(error.message);
    return data;
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

    const { getDASession } = await import("./directadmin.server");
    return await getDASession(data.serverId, targetUsername, data.redirectUrl);
  });




export const getServiceServerDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: serviceId, context }) => {
    // SECURITY: Verify ownership of the service
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    const { data: service, error } = await context.supabase
      .from("services")
      .select("*, servers(*)")
      .eq("id", serviceId)
      .single();

    if (error || !service) throw new Error("Serviço não encontrado");

    // If not admin, the service must belong to the user
    if (!isAdmin && service.user_id !== context.userId) {
      throw new Error("Acesso negado: Você não possui permissão para acessar este serviço.");
    }
    
    // Se for DirectAdmin, poderíamos buscar estatísticas reais aqui futuramente
    // Por enquanto retornamos os dados do banco e as capacidades do servidor
    return service;
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
        whmcs_id: input.external_id ? parseInt(input.external_id) : null,
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

    const pricesToInsert = input.prices.map(p => ({
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
        whmcs_id: input.external_id ? parseInt(input.external_id) : null,
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

    const pricesToInsert = input.prices.map(p => ({
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
      username: z.string().nullable(),
      domain: z.string().nullable(),
      server_id: z.string().uuid().nullable(),
      product_id: z.string().uuid().nullable(),
      next_due_date: z.string().nullable(),
      status: z.enum(["active", "pending", "suspended", "terminated", "cancelled"]).nullable(),
      block_directadmin: z.boolean().optional(),
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");

    const { error } = await supabaseAdmin
      .from("services")
      .update({
        username: input.username,
        domain: input.domain,
        server_id: input.server_id,
        product_id: input.product_id,
        next_due_date: input.next_due_date,
        status: input.status ? (input.status as any) : null,
        block_directadmin: input.block_directadmin !== undefined ? input.block_directadmin : undefined
      })
      .eq("id", input.serviceId);

    if (error) throw new Error(`Erro ao atualizar serviço: ${error.message}`);

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


