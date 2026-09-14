import type { AffiliateAccount, ProductCommissionRule, GlobalAffiliateSettings } from "@/lib/affiliates/types";

export type ProductRuleMap = Record<
  string,
  {
    type: "percentage" | "fixed";
    value: number;
    isEnabled: boolean;
  }
>;

export interface AffiliatesAdminData {
  affiliates: AffiliateAccount[];
  productSettings?: {
    globalSettings: GlobalAffiliateSettings;
    productRules: ProductCommissionRule[];
  };
}
