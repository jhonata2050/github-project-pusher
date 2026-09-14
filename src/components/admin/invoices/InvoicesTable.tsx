import { Link } from "@tanstack/react-router";
import { User, FileEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { brl, STATUS_LABELS, type AdminInvoiceRecord } from "./types";

interface InvoicesTableProps {
  invoices: AdminInvoiceRecord[];
  isLoading: boolean;
  onManage: (invoice: AdminInvoiceRecord) => void;
}

export function InvoicesTable({ invoices, isLoading, onManage }: InvoicesTableProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-secondary/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Fatura</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Método</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [0, 1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-4">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhuma fatura encontrada
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const status = STATUS_LABELS[inv.status] || { label: inv.status, color: "bg-muted text-muted-foreground" };
                return (
                  <tr key={inv.id} className="hover:bg-sidebar-accent/50 transition-colors">
                    <td className="px-4 py-4 font-medium">
                      <div className="flex flex-col">
                        <span className="font-bold">#{inv.id.slice(0, 8)}</span>
                        {inv.notes && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={inv.notes}>
                            {inv.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        {inv.user_id ? (
                          <Link 
                            to="/admin/clients/$clientId" 
                            params={{ clientId: inv.user_id }}
                            className="font-medium text-brand hover:underline flex items-center gap-1"
                          >
                            <User className="size-3" />
                            {inv.profiles?.full_name || "Cliente"}
                          </Link>
                        ) : (
                          <span className="font-medium text-foreground">{inv.profiles?.full_name || "—"}</span>
                        )}
                        <span className="text-xs text-muted-foreground">{inv.profiles?.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-4 font-semibold text-foreground">
                      <span>{brl.format(Number(inv.total_amount))}</span>
                      {Number(inv.discount_amount) > 0 && (
                        <span className="text-[10px] text-emerald-600 block">
                          Desc: {brl.format(Number(inv.discount_amount))}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs capitalize text-muted-foreground">
                      {inv.payment_method || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={cn("rounded-full px-3 py-0.5 text-[11px] font-bold uppercase", status.color)}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-8 text-xs gap-1.5 border-brand/40 text-brand hover:bg-brand/10 font-semibold"
                        onClick={() => onManage(inv)}
                      >
                        <FileEdit className="size-3.5" /> Gerenciar
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
