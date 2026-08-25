import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAvailableUpgrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ serviceId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getAvailableUpgradesImplementation } = await import("./upgrade.server");
    return getAvailableUpgradesImplementation(data.serviceId, context.userId);
  });

export const requestServiceUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({
    serviceId: z.string().uuid(),
    targetProductId: z.string().uuid(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { createUpgradeOrderImplementation } = await import("./upgrade.server");
    return createUpgradeOrderImplementation(data.serviceId, data.targetProductId, context.userId);
  });
