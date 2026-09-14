export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" },
  paid: { label: "Paga", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground border border-border" },
  refunded: { label: "Estornada", color: "bg-destructive/10 text-destructive border border-destructive/20" },
  overdue: { label: "Atrasada", color: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" },
};

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number | string;
  quantity?: number | null | undefined;
}

export interface AdminInvoiceRecord {
  id: string;
  user_id: string | null;
  status: string;
  total_amount: number | string;
  subtotal?: number | string | null | undefined;
  discount_amount?: number | string | null | undefined;
  due_date: string;
  paid_at?: string | null | undefined;
  payment_method?: string | null | undefined;
  notes?: string | null | undefined;
  created_at: string;
  invoice_items?: InvoiceItem[] | undefined;
  profiles?: {
    id?: string | undefined;
    full_name?: string | null | undefined;
    email?: string | null | undefined;
  } | null | undefined;
}
