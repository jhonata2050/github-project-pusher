import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getSystemLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ 
    serviceId: z.string().optional(), 
    actorId: z.string().optional(),
    category: z.string().optional(),
    level: z.string().optional(),
    limit: z.number().default(50)
  }).parse(data))
  .handler(async ({ data, context }) => {
    // SECURITY: Only admins can read global logs
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    let query = context.supabase
      .from("system_logs" as any)
      .select(`
        *,
        profiles:actor_id(full_name, email),
        services:service_id(domain, products(name))
      `)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (!isAdmin) {
      // Users only see logs where they are the actor
      query = query.eq("actor_id", context.userId);
    } else {
      // Admins can filter
      if (data.serviceId) query = query.eq("service_id", data.serviceId);
      if (data.actorId) query = query.eq("actor_id", data.actorId);
      if (data.category) query = query.eq("category", data.category);
      if (data.level) query = query.eq("level", data.level);
    }

    const { data: logs, error } = await query;
    if (error) throw error;
    return logs;
  });
