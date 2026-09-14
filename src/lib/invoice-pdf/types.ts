export interface InvoicePDFData {
  invoice: {
    id: string;
    total_amount: number;
    status: string;
    due_date: string;
    paid_at?: string | null;
    payment_method?: string | null;
    created_at?: string | null;
    items?: Array<{
      id?: string;
      description?: string;
      amount?: number;
    }>;
  };
  client?: {
    full_name?: string | null;
    email?: string | null;
    document?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  branding?: {
    app_name?: string;
    company_name?: string;
    company_document?: string;
    support_email?: string;
    website?: string;
    logo_url?: string | null;
    primary_color?: string;
    brand_color?: string;
  };
  financialSummary?: {
    originalAmount?: number;
    lateFee?: number;
    interest?: number;
    discount?: number;
    finalAmount?: number;
  };
}
