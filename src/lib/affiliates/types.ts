export interface AffiliateAccount {
  id: string;
  user_id: string;
  code: string;
  commission_percent: number;
  total_clicks: number;
  total_sales: number;
  pending_commission: number;
  available_balance: number;
  paid_earnings: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  } | null;
}

export interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  referred_user_id?: string | null;
  sale_amount: number;
  commission_amount: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  created_at: string;
  invoice_id?: string;
  order_id?: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export interface ProductCommissionRule {
  productId: string;
  productName: string;
  groupName?: string;
  type: "percentage" | "fixed";
  value: number;
  isEnabled: boolean;
}

export interface GlobalAffiliateSettings {
  defaultPercent: number;
  cookieDurationDays: number;
  minWithdrawAmount: number;
  autoApprove: boolean;
}
