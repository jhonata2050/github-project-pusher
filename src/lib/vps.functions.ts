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
    const { userId } = context as any;
    if (!userId) throw new Error("Unauthorized");

    return performContaboAction(data.instanceId, data.action, userId);
  });
