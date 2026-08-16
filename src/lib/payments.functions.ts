import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const paymentInputSchema = z.object({
  invoiceId: z.string(),
  method: z.enum(["pix", "credit_card", "boleto"]),
  gateway: z.string().default("abacatepay"),
});

export const initializePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => paymentInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { createPaymentSession } = await import("./payments.server");
    return createPaymentSession(context.userId, data);
  });
