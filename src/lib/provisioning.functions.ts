import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getProvisioningLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ serviceId: z.string().optional(), clientId: z.string().optional() }).parse(data))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("provisioning_logs")
      .select(`
        *,
        services(id, domain, products(name)),
        profiles:user_id(full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (data.serviceId) {
      query = query.eq("service_id", data.serviceId);
    }
    if (data.clientId) {
      query = query.eq("user_id", data.clientId);
    }

    const { data: logs, error } = await query;
    if (error) throw error;
    return logs;
  });
