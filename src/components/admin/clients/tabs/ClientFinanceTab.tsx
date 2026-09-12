import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, PlusCircle, FileEdit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientFinanceTabProps {
  accountBalance: number;
  invoices?: any[];
  isLoading?: boolean;
  onOpenBalanceModal: () => void;
  onOpenNewInvoiceModal: () => void;
  onManageInvoice: (invoice: any) => void;
}

export function ClientFinanceTab({
  accountBalance,
  invoices = [],
  isLoading = false,
  onOpenBalanceModal,
  onOpenNewInvoiceModal,
  onManageInvoice,
}: ClientFinanceTabProps) {
  return (
    <div className="space-y-6">
      {/* Card de Saldo da Carteira */}
      <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-emerald-500/20 text-emerald-600 rounded-2xl">
              <Wallet className="size-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Saldo da Carteira do Cliente</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-0.5">
                R$ {Number(accountBalance || 0).toFixed(2)}
              </h3>
            </div>
          </div>
          <div>
            <Button 
              onClick={onOpenBalanceModal}
              className="rounded-2xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <PlusCircle className="size-4" /> Ajustar Saldo / Conceder Crédito
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Histórico Financeiro</CardTitle>
            <CardDescription className="text-xs">Faturas pagas, pendentes e canceladas</CardDescription>
          </div>
          <Button 
            size="sm"
            onClick={onOpenNewInvoiceModal}
            className="rounded-xl h-9 gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90 shrink-0 font-medium"
          >
            <PlusCircle className="size-4" /> Nova Fatura Manual
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-40" /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Fatura</TableHead>
                    <TableHead className="whitespace-nowrap">Valor</TableHead>
                    <TableHead className="whitespace-nowrap">Vencimento</TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap">Pago em</TableHead>
                    <TableHead className="hidden md:table-cell">Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-bold">#{inv.id.slice(0, 8)}</span>
                          {inv.notes && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={inv.notes}>
                              {inv.notes}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold">R$ {Number(inv.total_amount).toFixed(2)}</span>
                        {Number(inv.discount_amount) > 0 && (
                          <span className="text-[10px] text-emerald-600 block">
                            Desc: R$ {Number(inv.discount_amount).toFixed(2)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(inv.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">
                        {inv.paid_at ? format(new Date(inv.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs capitalize text-muted-foreground">
                        {inv.payment_method || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={inv.status === 'paid' ? 'default' : inv.status === 'overdue' ? 'destructive' : 'secondary'}
                          className="text-[10px] uppercase font-bold"
                        >
                          {inv.status === 'paid' ? 'Pago' : inv.status === 'pending' ? 'Pendente' : inv.status === 'overdue' ? 'Vencida' : inv.status === 'cancelled' ? 'Cancelada' : inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl h-8 text-xs gap-1.5 border-brand/30 text-brand hover:bg-brand/10 font-semibold"
                          onClick={() => onManageInvoice(inv)}
                        >
                          <FileEdit className="size-3.5" /> Gerenciar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhuma fatura encontrada</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
