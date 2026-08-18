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
      .select('*, service:services(*)')
      .eq('id', data.instanceId)
      .single();

    if (instError || !vps) throw new Error("Instância não encontrada");
    if (vps.service.user_id !== userId) throw new Error("Acesso negado");

    const { getContaboInstanceDetails, getContaboInstanceStats } = await import("./contabo.server");

    try {
      const externalDetails = await getContaboInstanceDetails(vps.external_id);
      const stats = await getContaboInstanceStats(vps.external_id);

      return {
        ...vps,
        externalDetails,
        stats
      };
    } catch (err: any) {
      console.error("Erro ao buscar detalhes na Contabo:", err.message);
      // Retornar dados parciais do banco se a API falhar
      return {
        ...vps,
        apiError: err.message
      };
    }
  });
