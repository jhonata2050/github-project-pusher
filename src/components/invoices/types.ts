import type { PaymentMethod } from "@/lib/gateways";

export type PaymentMethodType = "pix" | "credit_card" | "boleto" | "wallet";

export interface InvoiceItemData {
  id: string;
  description: string;
  amount: number | string;
  [key: string]: any;
}

export interface InvoiceProfileData {
  id?: string | undefined;
  full_name?: string | null | undefined;
  email?: string | null | undefined;
  [key: string]: any;
}

export interface InvoiceDetailData {
  id: string;
  user_id?: string | null | undefined;
  total_amount?: number | string | null | undefined;
  subtotal?: number | string | null | undefined;
  discount_amount?: number | string | null | undefined;
  tax_amount?: number | string | null | undefined;
  status: string;
  due_date?: string | null | undefined;
  paid_at?: string | null | undefined;
  payment_method?: string | null | undefined;
  created_at: string;
  notes?: string | null | undefined;
  invoice_items?: InvoiceItemData[] | null | undefined;
  profiles?: InvoiceProfileData | null | undefined;
  [key: string]: any;
}

export interface PaymentResultData {
  method: string;
  qrCodeUrl?: string | undefined;
  pixCode?: string | undefined;
  digitableLine?: string | undefined;
  checkoutUrl?: string | undefined;
  [key: string]: any;
}

export interface InvoiceHeaderProps {
  invoice: InvoiceDetailData;
  isOverdue: boolean;
  statusInfo: { label: string; color: string };
  onDownloadPDF: (isReceipt?: boolean) => void;
}

export interface InvoiceItemsTableProps {
  invoice: InvoiceDetailData;
}

export interface InvoicePaymentCardProps {
  invoice: InvoiceDetailData;
  walletBalance: number;
  paymentMethod: PaymentMethodType;
  paymentResult: PaymentResultData | null;
  isWalletPaying: boolean;
  isPaymentPending: boolean;
  onSelectPaymentMethod: (method: PaymentMethodType) => void;
  onClearPaymentResult: () => void;
  onPayWithWallet: () => void;
  onPayWithGateway: (method: PaymentMethod) => void;
  onDownloadReceipt: () => void;
}
