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
  domain: z.string().optional(),
});

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orderInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { placeOrder } = await import("./finance.server");
    return placeOrder(context.userId, data);
  });

export const getInvoiceDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { fetchInvoiceDetails } = await import("./finance.server");
    return fetchInvoiceDetails(context.userId, data.id);
  });
