import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

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
        name: input.name,
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
      name: input.name,
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

    const { testDAConnectionDetails } = await import("../directadmin.server");
    return testDAConnectionDetails(serverId);
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

    const { getDAPackages } = await import("../directadmin.server");
    return await getDAPackages(serverId);
  });

export const getDACapabilitiesList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: serverId, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { getDACapabilities } = await import("../directadmin.server");
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
    const { validateDASSORequest } = await import("../security.server");
    const { targetUsername } = await validateDASSORequest(context.userId, data.username, data.serverId);

    const { getHostingProvider } = await import("../hosting-provider-factory.server");
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

    const { getHostingProvider } = await import("../hosting-provider-factory.server");
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

