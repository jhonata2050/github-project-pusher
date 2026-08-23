import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeVPSStatus } from "@/lib/vps-status";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Busca os serviços do usuário usando supabaseAdmin para evitar RLS restritivo
    // Incluímos o join com products para garantir que o product_type esteja disponível
    const { data: services, error: svcError } = await supabaseAdmin
      .from('services')
      .select('*, products(product_type)')
      .eq('user_id', requestedUserId);
    
    if (svcError) throw svcError;

    const serviceIds = (services ?? []).map((s: any) => s.id);
    if (serviceIds.length === 0) return [];

    // Busca as instâncias vinculadas a esses serviços usando supabaseAdmin
    const { data: instances, error } = await supabaseAdmin
      .from('vps_instances')
      .select('id, service_id, external_id, provider_id, provider_name, ip_address, status, region, os_template, cpu_cores, ram_gb, disk_gb, last_metrics, created_at')
      .in('service_id', serviceIds);
    
    if (error) throw error;

    return (instances ?? []).map((i: any) => {
      const service = (services ?? []).find((s: any) => s.id === i.service_id);
      return {
        ...i,
        service: service ?? null,
      };
    }).filter((i: any) => i.service !== null);
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

    // Validar propriedade da instância antes de permitir ação
    const { data: services, error: svcError } = await supabase
      .from('services')
      .select('id')
      .eq('user_id', userId);

    if (svcError || !services) throw new Error("Erro ao validar acesso aos serviços");
    
    const serviceIds = services.map((s: any) => s.id);
    if (serviceIds.length === 0) throw new Error("Nenhum serviço encontrado para este usuário");

    const { data: instance, error: instError } = await supabase
      .from('vps_instances')
      .select('id')
      .eq('id', data.instanceId)
      .in('service_id', serviceIds)
      .maybeSingle();

    if (instError || !instance) throw new Error("Acesso negado à instância VPS");

    const { performContaboAction } = await import("./contabo.server");
    return performContaboAction(data.instanceId, data.action, userId);
  });

export const getVPSDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ instanceId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (!userId) throw new Error("Unauthorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verificar posse usando admin para garantir leitura
    const { data: vps, error: instError } = await supabaseAdmin
      .from('vps_instances')
      .select('id, service_id, external_id, provider_id, provider_name, ip_address, status, region, os_template, cpu_cores, ram_gb, disk_gb, last_metrics, created_at')
      .eq('id', data.instanceId)
      .maybeSingle();

    if (instError || !vps) throw new Error("Instância não encontrada");

    let service: any = null;
    if (vps.service_id) {
      const { data: svc } = await supabaseAdmin
        .from('services')
        .select('*')
        .eq('id', vps.service_id)
        .maybeSingle();
      service = svc ?? null;
    }

    const { data: isStaff } = await supabase.rpc('is_staff', { _user_id: userId });
    if (!isStaff && service?.user_id !== userId) throw new Error("Acesso negado");

    const { getContaboInstanceDetails, getContaboInstanceStats } = await import("./contabo.server");

    try {
      const externalDetails = await getContaboInstanceDetails(vps.external_id);

      // Sincroniza SEMPRE com os dados reais retornados pela própria VPS
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

        const specs = externalDetails.specs ?? {};
        if (specs.cpu_cores && specs.cpu_cores !== vps.cpu_cores) updates.cpu_cores = specs.cpu_cores;
        if (specs.ram_gb && specs.ram_gb !== vps.ram_gb) updates.ram_gb = specs.ram_gb;
        if (specs.disk_gb && specs.disk_gb !== vps.disk_gb) updates.disk_gb = specs.disk_gb;

        if (Object.keys(updates).length > 0) {
          await supabaseAdmin
            .from('vps_instances')
            .update(updates)
            .eq('id', vps.id);

          Object.assign(vps, updates);
        }
      }


      const stats = await getContaboInstanceStats(vps.external_id);

      return {
        ...vps,
        service,
        externalDetails,
        stats
      };
    } catch (err: any) {
      console.error("Erro ao buscar detalhes na Contabo:", err.message);
      return {
        ...vps,
        service,
        apiError: err.message
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

    let interval = '24 hours';
    if (data.period === '7d') interval = '7 days';
    if (data.period === '30d') interval = '30 days';

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verificar se o usuário tem acesso à VPS antes de buscar histórico
    const { data: vps } = await supabaseAdmin
      .from('vps_instances')
      .select('service_id')
      .eq('id', data.instanceId)
      .maybeSingle();
    
    if (!vps) throw new Error("VPS não encontrada");

    const { data: service } = await supabaseAdmin
      .from('services')
      .select('user_id')
      .eq('id', vps.service_id)
      .maybeSingle();
    
    const { data: isStaff } = await supabase.rpc('is_staff', { _user_id: userId });
    if (!isStaff && service?.user_id !== userId) throw new Error("Acesso negado");

    const { data: metrics, error } = await supabaseAdmin
      .from('vps_metrics_history')
      .select('cpu, ram, disk, created_at')
      .eq('vps_id', data.instanceId)
      .gte('created_at', new Date(Date.now() - (interval === '24 hours' ? 24*60*60*1000 : interval === '7 days' ? 7*24*60*60*1000 : 30*24*60*60*1000)).toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    return metrics;
  });
