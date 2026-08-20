import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAdminStatsImplementation } = await import("./admin.server");
    return getAdminStatsImplementation(context);
  });

export const getLeadSourceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getLeadSourceStatsImplementation } = await import("./admin.server");
    return getLeadSourceStatsImplementation(context);
  });

