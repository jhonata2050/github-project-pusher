import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getWalletData } = await import("./wallet.server");
    return getWalletData(context.supabase, context.userId);
  });

export const requestWalletDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ amount: z.number().min(5) }).parse(data))
  .handler(async ({ data, context }) => {
    const { createWalletDeposit } = await import("./wallet.server");
    return createWalletDeposit(context.supabase, context.userId, data.amount);
  });

export const payWithWalletBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ invoiceId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { payInvoiceWithBalance } = await import("./wallet.server");
    return payInvoiceWithBalance(context.supabase, context.userId, data.invoiceId);
  });

export const adminAdjustUserBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    targetUserId: z.string().uuid(),
    amount: z.number(),
    type: z.enum(["deposit", "refund", "bonus", "adjustment"]),
    description: z.string(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { adminAdjustBalance } = await import("./wallet.server");
    return adminAdjustBalance(
      context.userId,
      data.targetUserId,
      data.amount,
      data.type,
      data.description
    );
  });
