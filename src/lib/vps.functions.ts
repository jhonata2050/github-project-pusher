import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { 
  performContaboAction
} from "./contabo.server";

export const getMyVPSInstances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    if (!userId) throw new Error("Unauthorized");

    const { data: services, error: svcError } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', userId);
    if (svcError) throw svcError;

    const serviceIds = (services ?? []).map((s: any) => s.id);
    if (serviceIds.length === 0) return [];

    const { data: instances, error } = await supabase
      .from('vps_instances')
      .select('*')
      .in('service_id', serviceIds);
    if (error) throw error;

    return (instances ?? []).map((i: any) => ({
      ...i,
      service: (services ?? []).find((s: any) => s.id === i.service_id) ?? null,
    }));
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

    return performContaboAction(data.instanceId, data.action, userId);
  });

export const getVPSDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ instanceId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    if (!userId) throw new Error("Unauthorized");

    // Verificar posse
    const { data: vps, error: instError } = await supabase
      .from('vps_instances')
      .select('*')
      .eq('id', data.instanceId)
      .maybeSingle();

    if (instError || !vps) throw new Error("Instância não encontrada");

    let service: any = null;
    if (vps.service_id) {
      const { data: svc } = await supabase
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
      
      // Mapear dados reais da API para as colunas do banco se estiverem vazias ou forem diferentes
      // Isso ajuda a manter o banco sincronizado com a verdade da API
      if (externalDetails) {
        const updates: any = {};
        if (externalDetails.region && vps.region !== externalDetails.region) updates.region = externalDetails.region;
        // Se a API retornar CPU/RAM/Disco físicos, podemos atualizar aqui também
        // Mas por enquanto vamos priorizar o que está no banco que o usuário corrigiu
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

    const { data: metrics, error } = await supabase
      .from('vps_metrics_history')
      .select('cpu, ram, disk, created_at')
      .eq('vps_id', data.instanceId)
      .gte('created_at', new Date(Date.now() - (interval === '24 hours' ? 24*60*60*1000 : interval === '7 days' ? 7*24*60*60*1000 : 30*24*60*60*1000)).toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    return metrics;
  });
