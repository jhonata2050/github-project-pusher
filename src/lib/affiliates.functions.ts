import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyAffiliateData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getOrCreateAffiliate, getAffiliateReferrals } = await import("./affiliates.server");
    const affiliate = await getOrCreateAffiliate(context.supabase, context.userId);
    const referrals = await getAffiliateReferrals(context.supabase, affiliate.id);

    return {
      affiliate,
      referrals,
    };
  });

export const transferAffiliateEarningsToWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ amount: z.number().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const { withdrawAffiliateToWallet } = await import("./affiliates.server");
    return withdrawAffiliateToWallet(context.userId, data.amount);
  });

export const getAdminAffiliates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAdminAffiliatesList, getProductCommissionSettings } = await import("./affiliates.server");
    const [affiliates, productSettings] = await Promise.all([
      getAdminAffiliatesList(context.supabase),
      getProductCommissionSettings(),
    ]);

    return {
      affiliates,
      productSettings,
    };
  });

export const saveAdminProductCommissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        rules: z.record(
          z.object({
            type: z.enum(["percentage", "fixed"]),
            value: z.number().min(0),
            isEnabled: z.boolean(),
          })
        ),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const { saveProductCommissionSettings } = await import("./affiliates.server");
    return saveProductCommissionSettings(data.rules);
  });

export const saveAdminGlobalAffiliateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        defaultPercent: z.number().min(0).max(100),
        cookieDurationDays: z.number().min(1),
        minWithdrawAmount: z.number().min(1),
        autoApprove: z.boolean(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const { saveGlobalAffiliateSettings } = await import("./affiliates.server");
    return saveGlobalAffiliateSettings(data);
  });

export const updateSingleAffiliatePercent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        affiliateId: z.string(),
        commissionPercent: z.number().min(0).max(100),
        isActive: z.boolean().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const { updateAffiliatePercent } = await import("./affiliates.server");
    return updateAffiliatePercent(data.affiliateId, data.commissionPercent, data.isActive);
  });

export const trackAffiliateClickFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        code: z.string().min(1),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const { trackAffiliateClick } = await import("./affiliates.server");
    return trackAffiliateClick(data.code);
  });

