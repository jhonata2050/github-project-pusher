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
        service:services(*)
      `);

    if (error) throw error;

    const rows = data ?? [];
    const userIds = [
      ...new Set(
        rows
          .map((r: any) => r.service?.user_id)
          .filter((id: string | undefined): id is string => Boolean(id)),
      ),
    ];

    let profilesById: Record<string, { full_name: string | null; email: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      if (profilesError) throw profilesError;
      profilesById = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]),
      );
    }

    return rows.map((r: any) => ({
      ...r,
      service: r.service
        ? { ...r.service, profile: profilesById[r.service.user_id] ?? null }
        : null,
    }));
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

export const updateVPSSSHDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    id: z.string(),
    ssh_host: z.string().optional().nullable(),
    ssh_port: z.number().optional().nullable(),
    ssh_user: z.string().optional().nullable(),
    ssh_password: z.string().optional().nullable()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { error } = await supabaseAdmin
      .from('vps_instances')
      .update({
        ssh_host: data.ssh_host,
        ssh_port: data.ssh_port || 22,
        ssh_user: data.ssh_user || 'root',
        ssh_password: data.ssh_password
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
