import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    data.forEach(s => {
      settings[s.key] = s.value;
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
      const { error } = await supabaseAdmin
        .from("system_settings")
        .upsert({ key, value }, { onConflict: 'key' });
      
      if (error) throw new Error(`Error updating ${key}: ${error.message}`);
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
    const { data: ticket, error: ticketError } = await context.supabase
      .from("tickets")
      .select(`
        *,
        profile:profiles(full_name, email)
      `)
      .eq("id", ticketId)
      .single();

    if (ticketError) throw new Error(ticketError.message);

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
        is_staff_reply: false
      });

    if (messageError) throw new Error(messageError.message);

    return ticket;
  });

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      ticketId: z.string(),
      message: z.string().min(1)
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });

    const { data, error } = await context.supabase
      .from("ticket_messages")
      .insert({
        ticket_id: input.ticketId,
        user_id: context.userId,
        message: input.message,
        is_staff_reply: isAdmin
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await context.supabase
      .from("tickets")
      .update({ 
        status: isAdmin ? "answered" : "customer-reply",
        updated_at: new Date().toISOString()
      })
      .eq("id", input.ticketId);

    return data;
  });

export const getServers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("servers")
      .select("*");

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
    const { data, error } = await context.supabase
      .from("servers")
      .insert({
        name: input.name,
        hostname: input.hostname,
        ip_address: input.ip_address ?? null,
        api_user: input.api_user,
        api_token: input.api_token,
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
      name: input.name,
      hostname: input.hostname,
      ip_address: input.ip_address ?? null,
      api_user: input.api_user,
      max_accounts: input.max_accounts,
      ...(input.api_token && input.api_token.length > 0 ? { api_token: input.api_token } : {}),
    };

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
    const { error } = await context.supabase.from("servers").delete().eq("id", serverId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const testDAConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: serverId }) => {
    const { testDAConnectionDetails } = await import("./directadmin.server");
    try {
      return await testDAConnectionDetails(serverId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      throw new Error(`Falha na conexão: ${message}`);
    }
  });


export const getDAPackagesList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: serverId }) => {
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
    // SECURITY: If not admin, verify ownership of the service before generating SSO
    const { data: isAdmin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    
    if (!isAdmin) {
      const { data: service } = await context.supabase
        .from("services")
        .select("id, username, server_id")
        .eq("user_id", context.userId)
        .eq("username", data.username)
        .eq("server_id", data.serverId)
        .maybeSingle();

      if (!service) {
        throw new Error("Acesso negado: Você não possui permissão para acessar este serviço.");
      }
    }

    const { getDASession } = await import("./directadmin.server");
    return await getDASession(data.serverId, data.username, data.redirectUrl);
  });



export const getServiceServerDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: serviceId, context }) => {
    const { data: service, error } = await context.supabase
      .from("services")
      .select("*, servers(*)")
      .eq("id", serviceId)
      .single();

    if (error || !service) throw new Error("Serviço não encontrado");
    
    // Se for DirectAdmin, poderíamos buscar estatísticas reais aqui futuramente
    // Por enquanto retornamos os dados do banco e as capacidades do servidor
    return service;
  });


export const getProductGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("product_groups")
      .select("*")
      .order("sort_order");

    if (error) throw new Error(error.message);
    return data;
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
        disk_quota_mb: input.disk_quota_mb
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
      status: z.enum(["active", "pending", "suspended", "terminated", "cancelled"]).nullable(),
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");

    const { error } = await context.supabase
      .from("services")
      .update({
        username: input.username,
        domain: input.domain,
        server_id: input.server_id,
        status: input.status ? (input.status as any) : undefined
      })
      .eq("id", input.serviceId);


    if (error) throw new Error(`Erro ao atualizar serviço: ${error.message}`);
    return { success: true };
  });


