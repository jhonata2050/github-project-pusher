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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Busca os serviços do usuário usando supabaseAdmin para evitar RLS restritivo no SELECT inicial
    const { data: services, error: svcError } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('user_id', userId);
    if (svcError) throw svcError;

    const serviceIds = (services ?? []).map((s: any) => s.id);
    if (serviceIds.length === 0) return [];

    // Busca as instâncias vinculadas a esses serviços usando supabaseAdmin
    const { data: instances, error } = await supabaseAdmin
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verificar posse usando admin para garantir leitura
    const { data: vps, error: instError } = await supabaseAdmin
      .from('vps_instances')
      .select('*')
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

    const { getContaboInstanceDetails, getContaboInstanceStats, getContaboProductTypes } = await import("./contabo.server");

    try {
      const externalDetails = await getContaboInstanceDetails(vps.external_id);
      
      // Mapear dados reais da API para as colunas do banco
      if (externalDetails) {
        const updates: any = {};
        
        // Sincronizar Região e OS se estiverem disponíveis
        if (externalDetails.region && vps.region !== externalDetails.region) {
          updates.region = externalDetails.region;
        }
        if (externalDetails.osTemplate && vps.os_template !== externalDetails.osTemplate) {
          updates.os_template = externalDetails.osTemplate;
        }

        // Tentar obter specs do produto se não estiverem no banco
        if (!vps.cpu_cores || !vps.ram_gb || !vps.disk_gb) {
          try {
            const products = await getContaboProductTypes();
            const productName = (externalDetails.productName || "").toLowerCase();
            
            // Procura o produto no catálogo para pegar os specs reais
            let foundProduct = null;
            for (const cat of products) {
              foundProduct = cat.items.find((item: any) => 
                productName.includes(item.name.toLowerCase()) || 
                item.productId === externalDetails.productId
              );
              if (foundProduct) break;
            }

            if (foundProduct) {
              // Extrair números dos títulos (ex: "4 vCPU" -> 4)
              const cpuMatch = foundProduct.vCpu.match(/\d+/);
              const diskMatch = foundProduct.diskGb.match(/\d+/);
              
              if (cpuMatch && !vps.cpu_cores) updates.cpu_cores = parseInt(cpuMatch[0]);
              if (foundProduct.ramMb && !vps.ram_gb) updates.ram_gb = Math.round(foundProduct.ramMb / 1024);
              if (diskMatch && !vps.disk_gb) updates.disk_gb = parseInt(diskMatch[0]);
            }
          } catch (e) {
            console.warn("Erro ao buscar specs do produto Contabo:", e);
          }
        }

        // Se houver atualizações, salvar no banco (usando admin para garantir sucesso)
        if (Object.keys(updates).length > 0) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from('vps_instances')
            .update(updates)
            .eq('id', vps.id);
          
          // Mesclar atualizações no objeto de retorno para visualização imediata
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
