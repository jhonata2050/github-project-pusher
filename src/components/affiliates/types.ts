import type { FormEvent } from "react";

export interface AffiliateBannerProps {
  commissionPercent?: number | undefined;
}

export interface AffiliateLinkCardProps {
  referralLink: string;
  isLoading: boolean;
  copied: boolean;
  onCopyLink: () => void;
}

export interface AffiliateStatsCardsProps {
  affiliate?: {
    total_clicks?: number;
    total_sales?: number;
    available_balance?: number;
    paid_earnings?: number;
  } | undefined;
  onOpenWithdrawModal: () => void;
}

export interface AffiliateReferralItem {
  id: string;
  created_at: string;
  sale_amount: number;
  commission_amount: number;
  status: string;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
}

export interface AffiliateReferralsCardProps {
  referrals: AffiliateReferralItem[];
}

export interface AffiliateWithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  withdrawAmount: string;
  onWithdrawAmountChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  isPending: boolean;
}
