import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeVPSStatus } from "@/lib/vps-status";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getVPSAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Buscar instâncias VPS
    const { data: instances, error: instError } = await supabaseAdmin
      .from('vps_instances')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Buscar serviços VPS
    const { data: services, error: svcError } = await supabaseAdmin
      .from('services')
      .select('*, products(id, name, product_type)')
      .order('created_at', { ascending: false });

    const allServices = services || [];
    const allInstances = instances || [];

    // 3. Buscar perfis dos usuários
    const userIds = [
      ...new Set([
        ...allServices.map((s: any) => s.user_id),
        ...allInstances.map((i: any) => i.user_id),
      ].filter(Boolean)),
    ];

    let profilesById: Record<string, { full_name: string | null; email: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      profilesById = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]),
      );
    }

    // Associar instâncias com seus respectivos serviços e perfis
    const rows = allInstances.map((inst: any) => {
      const matchedService = allServices.find((s: any) => s.id === inst.service_id);
      const targetUserId = matchedService?.user_id || inst.user_id;
      return {
        ...inst,
        service: matchedService
          ? { ...matchedService, profile: profilesById[targetUserId] ?? null }
          : null,
      };
    });

    // Se houver serviços de VPS sem instância criada ainda, incluir também na lista
    const vpsServicesWithoutInstance = allServices.filter(
      (s: any) => s.products?.product_type === 'vps' && !allInstances.some((i: any) => i.service_id === s.id)
    );

    vpsServicesWithoutInstance.forEach((s: any) => {
      rows.push({
        id: s.id,
        service_id: s.id,
        user_id: s.user_id,
        external_id: s.domain || s.username || 'Pendente',
        name: s.products?.name || 'Servidor VPS',
        ip_address: s.ip_address || null,
        status: s.status || 'pending',
        region: s.vps_region || 'BR',
        os_template: s.vps_os_template || 'Ubuntu',
        created_at: s.created_at,
        service: {
          ...s,
          profile: profilesById[s.user_id] ?? null,
        },
      });
    });

    return rows;
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

    try {
      const [{ getContaboInstances, mapContaboSpecs }, { supabaseAdmin }] = await Promise.all([
        import("./contabo.server"),
        import("@/integrations/supabase/client.server"),
      ]);
      const response = await getContaboInstances();
      const externalInstances = Array.isArray(response.data) ? response.data : [];

      for (const instance of externalInstances) {
        const externalId = instance?.instanceId ?? instance?.id;
        if (!externalId) continue;
        const ipAddress = instance.ipConfig?.v4?.ip ?? instance.ipAddress ?? instance.addOnIps?.[0]?.ip ?? null;
        const specs = mapContaboSpecs(instance);
        const payload: any = {
          user_id: context.userId,
          external_id: String(externalId),
          name: instance.displayName || instance.name || `VPS #${externalId}`,
          ip_address: ipAddress,
          status: normalizeVPSStatus(instance.status),
          region: instance.regionName ?? instance.region ?? null,
          os_template: instance.imageName ?? instance.osType ?? instance.osTemplate ?? instance.imageId ?? null,
        };

        const { data: existing } = await supabaseAdmin
          .from('vps_instances')
          .select('id')
          .eq('external_id', String(externalId))
          .maybeSingle();

        if (existing) {
          await supabaseAdmin.from('vps_instances').update(payload).eq('id', existing.id);
        } else {
          await supabaseAdmin.from('vps_instances').insert(payload);
        }
      }

      return externalInstances.map((instance: any) => {
        const ipAddress = instance.ipConfig?.v4?.ip ?? instance.ipAddress ?? instance.addOnIps?.[0]?.ip ?? 'N/A';
        return {
          ...instance,
          instanceId: instance.instanceId ?? instance.id,
          displayName: instance.displayName || instance.name || `VPS #${instance.instanceId}`,
          ipAddress: ipAddress,
        };
      });
    } catch (err: any) {
      console.error("Erro ao sincronizar instâncias Contabo:", err.message);
      if (err.message.includes("401") || err.message.includes("auth")) {
        throw new Error("Contabo recusou as credenciais (usuário/senha da API inválidos). Verifique em Admin > Financeiro.");
      }
      throw err;
    }
  });

export const performAdminVPSAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    instanceId: z.string(),
    action: z.enum(['start', 'stop', 'restart', 'reinstall'])
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: instance, error } = await supabaseAdmin
      .from('vps_instances')
      .select('external_id')
      .eq('id', data.instanceId)
      .maybeSingle();
    if (error || !instance?.external_id) throw new Error("Instância VPS não encontrada");

    const { performContaboActionByExternalId } = await import("./contabo.server");
    return performContaboActionByExternalId(instance.external_id, data.action);
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: service, error: svcError } = await supabaseAdmin
      .from('services')
      .select('id, user_id')
      .eq('id', data.serviceId)
      .single();

    if (svcError || !service) throw new Error("Serviço não encontrado");

    const { data: existing } = await supabaseAdmin
      .from('vps_instances')
      .select('id')
      .eq('external_id', data.externalId)
      .maybeSingle();

    const instancePayload: any = {
      user_id: service.user_id,
      external_id: data.externalId,
      name: data.name || 'Servidor VPS',
      ip_address: data.ipAddress || null,
      status: 'active'
    };

    if (existing) {
      await supabaseAdmin.from('vps_instances').update(instancePayload).eq('id', existing.id);
    } else {
      await supabaseAdmin.from('vps_instances').insert(instancePayload);
    }

    // Update service status and domain/hostname
    await supabaseAdmin
      .from('services')
      .update({
        status: 'active',
        domain: data.name || data.ipAddress || 'vps-server',
        vps_hostname: data.name || null,
      })
      .eq('id', data.serviceId);

    return { success: true };
  });

export const getContaboPlansFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    try {
      const { getContaboProductTypes } = await import("./contabo.server");
      const plans = await getContaboProductTypes();
      return plans ?? [];
    } catch (e) {
      console.warn("[VPS-Admin] Planos do provedor indisponíveis:", (e as Error).message);
      return [];
    }
  });

export const getAvailableVPSInstances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ serviceId: z.string().optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Unauthorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: allInstances, error } = await supabaseAdmin
      .from('vps_instances')
      .select('id, external_id, name, ip_address, status, user_id, region, os_template');
      
    if (error) {
      console.warn("[getAvailableVPSInstances] Warning:", error.message);
      return [];
    }

    return (allInstances ?? []).map((i: any) => ({
      ...i,
      displayName: i.name || `VPS ${i.external_id}`,
    }));
  });
