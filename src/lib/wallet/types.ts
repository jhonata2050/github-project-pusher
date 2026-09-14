export interface WalletTransaction {
  id: string;
  user_id: string;
  type: "deposit" | "payment" | "refund" | "bonus" | "adjustment";
  amount: number;
  balance_after: number;
  description: string;
  invoice_id?: string | null;
  created_at: string;
}
