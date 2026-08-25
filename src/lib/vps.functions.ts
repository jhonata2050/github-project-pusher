import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeVPSStatus } from "@/lib/vps-status";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMyVPSInstances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ clientId: z.string().uuid().optional() }).optional().parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (!userId) throw new Error("Unauthorized");

    const requestedUserId = data?.clientId ?? userId;
    if (requestedUserId !== userId) {
      const { data: isStaff, error: roleError } = await supabase.rpc('is_staff', { _user_id: userId });
      if (roleError || !isStaff) throw new Error("Acesso negado");
    }

    // 1. Busca os serviços do usuário
    const { data: services, error: svcError } = await supabaseAdmin
      .from('services')
      .select('*, products(product_type, name)')
      .eq('user_id', requestedUserId);
    
    if (svcError) {
      console.warn("[getMyVPSInstances] svcError:", svcError.message);
    }

    const allServices = services ?? [];

    // 2. Busca as instâncias VPS do usuário
    const { data: instances, error: instError } = await supabaseAdmin
      .from('vps_instances')
      .select('id, user_id, external_id, name, ip_address, status, region, os_template, created_at, updated_at')
      .eq('user_id', requestedUserId);
    
    if (instError) {
      console.warn("[getMyVPSInstances] instError:", instError.message);
      return [];
    }

    const allInstances = instances ?? [];

    return allInstances.map((i: any) => {
      const service = allServices.find((s: any) => 
        (s.domain && (s.domain === i.name || s.domain === i.ip_address)) ||
        (s.vps_hostname && s.vps_hostname === i.name) ||
        s.products?.product_type === 'vps'
      );
      return {
        ...i,
        service: service ?? null,
      };
    });
  });

export const contaboAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    instanceId: z.string(),
    action: z.enum(['start', 'stop', 'restart', 'reinstall'])
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (!userId) throw new Error("Unauthorized");

    const { data: instance, error: instError } = await supabaseAdmin
      .from('vps_instances')
      .select('id, user_id, external_id')
      .eq('id', data.instanceId)
      .maybeSingle();

    if (instError || !instance) throw new Error("Instância VPS não encontrada");

    const { data: isStaff } = await supabase.rpc('is_staff', { _user_id: userId });
    if (!isStaff && instance.user_id !== userId) throw new Error("Acesso negado à instância VPS");

    const { performContaboActionByExternalId } = await import("./contabo.server");
    return performContaboActionByExternalId(instance.external_id, data.action);
  });

export const getVPSDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ instanceId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (!userId) throw new Error("Unauthorized");

    const { data: vps, error: instError } = await supabaseAdmin
      .from('vps_instances')
      .select('id, user_id, external_id, name, ip_address, status, region, os_template, created_at, updated_at')
      .eq('id', data.instanceId)
      .maybeSingle();

    if (instError || !vps) throw new Error("Instância não encontrada");

    const { data: isStaff } = await supabase.rpc('is_staff', { _user_id: userId });
    if (!isStaff && vps.user_id !== userId) throw new Error("Acesso negado");

    const { data: service } = await supabaseAdmin
      .from('services')
      .select('*, products(name, product_type)')
      .eq('user_id', vps.user_id)
      .or(`domain.eq.${vps.name},vps_hostname.eq.${vps.name},domain.eq.${vps.ip_address}`)
      .maybeSingle();

    const { getContaboInstanceDetails, getContaboInstanceStats } = await import("./contabo.server");

    try {
      const externalDetails = await getContaboInstanceDetails(vps.external_id);

      if (externalDetails) {
        const updates: any = {};
        const realRegion = externalDetails.regionName || externalDetails.region;
        const realOs = externalDetails.osTemplate;

        if (realRegion && vps.region !== realRegion) updates.region = realRegion;
        if (realOs && vps.os_template !== realOs) updates.os_template = realOs;
        if (externalDetails.ipAddress && externalDetails.ipAddress !== 'N/A' && vps.ip_address !== externalDetails.ipAddress) {
          updates.ip_address = externalDetails.ipAddress;
        }
        const normalizedStatus = normalizeVPSStatus(externalDetails.status);
        if (externalDetails.status && vps.status !== normalizedStatus) {
          updates.status = normalizedStatus;
        }

        if (Object.keys(updates).length > 0) {
          await supabaseAdmin
            .from('vps_instances')
            .update(updates)
            .eq('id', vps.id);

          Object.assign(vps, updates);
        }
      }

      let stats = null;
      try {
        stats = await getContaboInstanceStats(vps.external_id);
      } catch (e) {}

      // Obter métricas reportadas pelo agente
      const { getVPSLatestMetrics } = await import("./vps-metrics.server");
      const agentMetrics = getVPSLatestMetrics(vps.id);

      return {
        ...vps,
        service,
        externalDetails,
        stats,
        last_metrics: agentMetrics || null
      };
    } catch (err: any) {
      console.error("Erro ao buscar detalhes na Contabo:", err.message);
      const { getVPSLatestMetrics } = await import("./vps-metrics.server");
      return {
        ...vps,
        service,
        apiError: err.message,
        last_metrics: getVPSLatestMetrics(vps.id) || null
      };
    }
  });

export const getVPSMetricsHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ 
    instanceId: z.string(),
    period: z.enum(['24h', '7d', '30d'])
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (!userId) throw new Error("Unauthorized");

    const { data: vps } = await supabaseAdmin
      .from('vps_instances')
      .select('id, user_id')
      .eq('id', data.instanceId)
      .maybeSingle();
    
    if (!vps) throw new Error("VPS não encontrada");
    
    const { data: isStaff } = await supabase.rpc('is_staff', { _user_id: userId });
    if (!isStaff && vps.user_id !== userId) throw new Error("Acesso negado");

    const { getVPSHistory } = await import("./vps-metrics.server");
    return getVPSHistory(data.instanceId, data.period);
  });
