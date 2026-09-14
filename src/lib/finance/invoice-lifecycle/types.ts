export type BillingCycle =
  | "monthly"
  | "quarterly"
  | "semiannually"
  | "annually"
  | "biennially";

export interface PlaceOrderParams {
  productId: string;
  billingCycle: BillingCycle;
  couponCode?: string | undefined;
  domain?: string | undefined;
  vpsConfig?: {
    hostname: string;
    os: string;
    location: string;
  } | undefined;
}

export interface AdminUpdateInvoiceParams {
  id: string;
  status?: "pending" | "paid" | "cancelled" | "refunded" | "overdue";
  due_date?: string;
  total_amount?: number;
  subtotal?: number;
  discount_amount?: number;
  payment_method?: string | null;
  paid_at?: string | null;
  notes?: string | null;
}

export interface AdminCreateManualInvoiceParams {
  userId: string;
  description: string;
  amount: number;
  dueDate: string;
  serviceId?: string | null;
  notes?: string | null;
  status?: "pending" | "paid";
  paymentMethod?: string | null;
}
