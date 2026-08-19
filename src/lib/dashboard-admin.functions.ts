import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Importação dinâmica para isolar código do servidor
    const { getAdminStatsImplementation } = await import("./admin.server");
    return getAdminStatsImplementation(context);
  });
