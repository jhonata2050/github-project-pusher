import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orderInputSchema = z.object({
  productId: z.string(),
  billingCycle: z.enum([
    "monthly",
    "quarterly",
    "semiannually",
    "annually",
    "biennially",
  ]),
  couponCode: z.string().optional(),
  affCode: z.string().optional(),
  domain: z.string().optional(),
  clientId: z.string().optional(),
  vpsConfig: z.object({
    hostname: z.string().trim().min(1).max(253),
    os: z.string().trim().min(1).max(120),
    location: z.string().trim().min(1).max(80),
  }).optional(),
});

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orderInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    let targetUserId = context.userId;
    if (data.clientId && data.clientId !== context.userId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (isAdmin) {
        targetUserId = data.clientId;
      }
    }
    const { placeOrder } = await import("./finance.server");
    return placeOrder(targetUserId, data);
  });

export const getInvoiceDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { fetchInvoiceDetails } = await import("./finance.server");
    return fetchInvoiceDetails(context.supabase, context.userId, data.id);
  });
