import { QrCode, CreditCard, FileText } from "lucide-react";
import type { PaymentMethodType } from "./types";

export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const METHOD_OPTIONS: { id: "pix" | "credit_card" | "boleto"; hint: string; icon: typeof QrCode }[] = [
  { id: "pix", hint: "Aprovação imediata", icon: QrCode },
  { id: "credit_card", hint: "Renovação automática", icon: CreditCard },
  { id: "boleto", hint: "Vence em 3 dias", icon: FileText },
];

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-warning text-warning-foreground" },
  paid: { label: "Paga", color: "bg-success text-success-foreground" },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground" },
  refunded: { label: "Estornada", color: "bg-destructive text-destructive-foreground" },
  overdue: { label: "Atrasada", color: "bg-destructive text-destructive-foreground" },
};

export function getInvoiceStatusInfo(status: string, isOverdue: boolean) {
  const statusKey = isOverdue ? "overdue" : status;
  return STATUS_LABELS[statusKey] || { label: status, color: "bg-muted" };
}
