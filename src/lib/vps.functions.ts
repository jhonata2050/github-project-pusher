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

    const { data: instances, error } = await supabase
      .from('vps_instances')
      .select('*, service!inner(*)')
      .eq('service.user_id', userId);

    if (error) throw error;
    return instances;
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
