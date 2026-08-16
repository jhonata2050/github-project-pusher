import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getVPSAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
      .from('vps_instances')
      .select(`
        *,
        service:services(
          *,
          profile:profiles(full_name, email)
        )
      `);

    if (error) throw error;
    return data;
  });

export const updateVPSInstance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    id: z.string(),
    external_id: z.string(),
    ip_address: z.string().nullable(),
    status: z.string()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { error } = await supabaseAdmin
      .from('vps_instances')
      .update({
        external_id: data.external_id,
        ip_address: data.ip_address,
        status: data.status
      })
      .eq('id', data.id);

    if (error) throw error;
    return { success: true };
  });

export const syncContaboInstancesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { getContaboInstances } = await import("./contabo.server");
    const response = await getContaboInstances();
    return response.data || [];
  });

export const assignInstanceToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    serviceId: z.string(),
    externalId: z.string(),
    ipAddress: z.string().optional(),
    name: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { error } = await supabaseAdmin
      .from('vps_instances')
      .upsert({
        service_id: data.serviceId,
        external_id: data.externalId,
        ip_address: data.ipAddress || null,
        status: 'active'
      }, { onConflict: 'service_id' });

    if (error) throw error;
    
    // Update service status to active if not already
    await supabaseAdmin
      .from('services')
      .update({ status: 'active' })
      .eq('id', data.serviceId);

    return { success: true };
  });

export const getContaboPlansFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { getContaboProductTypes } = await import("./contabo.server");
    console.log("[VPS-Admin] Chamando getContaboProductTypes...");
    const plans = await getContaboProductTypes();
    console.log(`[VPS-Admin] Retornados ${plans?.length || 0} planos da Contabo.`);
    return plans;
  });
