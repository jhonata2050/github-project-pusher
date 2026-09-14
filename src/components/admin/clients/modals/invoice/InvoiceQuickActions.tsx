import { Check, Gift, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { InvoiceQuickActionsProps } from "./types";

export function InvoiceQuickActions({
  managingInvoice,
  onUpdateInvoice,
  isPending,
}: InvoiceQuickActionsProps) {
  return (
    <div className="p-3.5 mt-4 rounded-2xl bg-muted/40 border space-y-2">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
        Ações Administrativas Rápidas
      </span>
      <div className="flex flex-wrap gap-2">
        {managingInvoice.status !== 'paid' && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onUpdateInvoice({
                id: managingInvoice.id,
                status: 'paid',
                payment_method: managingInvoice.payment_method || 'manual_admin',
                paid_at: new Date().toISOString(),
                notes: (managingInvoice.notes ? managingInvoice.notes + '\n' : '') + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] Baixa manual efetuada pelo administrador.`,
              });
            }}
            disabled={isPending}
            className="rounded-xl h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <Check className="size-3.5" /> Dar Baixa Manual (Ativar/Renovar)
          </Button>
        )}

        {managingInvoice.status !== 'paid' && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onUpdateInvoice({
                id: managingInvoice.id,
                status: 'paid',
                payment_method: 'abono_cortesia',
                discount_amount: Number(managingInvoice.total_amount),
                paid_at: new Date().toISOString(),
                notes: (managingInvoice.notes ? managingInvoice.notes + '\n' : '') + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] Fatura abonada pela administração.`,
              });
            }}
            disabled={isPending}
            className="rounded-xl h-8 text-xs gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 font-semibold"
          >
            <Gift className="size-3.5" /> Abonar Fatura (Cortesia)
          </Button>
        )}

        {managingInvoice.status !== 'cancelled' && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onUpdateInvoice({
                id: managingInvoice.id,
                status: 'cancelled',
                notes: (managingInvoice.notes ? managingInvoice.notes + '\n' : '') + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] Cancelada pelo administrador.`,
              });
            }}
            disabled={isPending}
            className="rounded-xl h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <XCircle className="size-3.5" /> Cancelar Fatura
          </Button>
        )}
      </div>
    </div>
  );
}
