import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const validationSchema = z.object({
  gatewayId: z.string(),
  credentials: z.record(z.string(), z.string()),
});

export const testGatewayConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => validationSchema.parse(data))
  .handler(async ({ data }) => {
    const { validateGateway } = await import("./gateway-validation.server");
    return validateGateway(data.gatewayId, data.credentials);
  });
