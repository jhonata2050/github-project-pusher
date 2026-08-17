import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const paymentInputSchema = z.object({
  invoiceId: z.string(),
  method: z.enum(["pix", "credit_card", "boleto"]),
  gateway: z.string().optional(),
});

export const initializePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => paymentInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { createPaymentSessionWithFallback } = await import("./payments.server");
    return createPaymentSessionWithFallback(context.userId, { 
      ...data, 
      gateway: data.gateway || "abacatepay" 
    });
  });
