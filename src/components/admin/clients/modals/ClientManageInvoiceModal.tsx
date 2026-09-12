import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileEdit, Check, Gift, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminUpdateInvoice } from "@/lib/finance.functions";

interface ClientManageInvoiceModalProps {
  managingInvoice: any;
  setManagingInvoice: React.Dispatch<React.SetStateAction<any>>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function ClientManageInvoiceModal({
  managingInvoice,
  setManagingInvoice,
  isOpen,
  onOpenChange,
  clientId,
}: ClientManageInvoiceModalProps) {
  const queryClient = useQueryClient();
  const executeUpdateInvoice = useServerFn(adminUpdateInvoice);

  const updateInvoiceMutation = useMutation({
    mutationFn: (data: any) => executeUpdateInvoice({ data }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      onOpenChange(false);
      setManagingInvoice(null);
      if (res?.provisioningTriggered) {
        toast.success("Fatura baixada com sucesso! Serviços ativados/renovados.");
      } else {
        toast.success("Fatura atualizada com sucesso!");
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar fatura: " + err.message);
    }
  });

  if (!managingInvoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileEdit className="size-5 text-brand" /> 
              Fatura #{managingInvoice.id.slice(0, 8)}
            </DialogTitle>
            <Badge 
              variant={managingInvoice.status === 'paid' ? 'default' : managingInvoice.status === 'overdue' ? 'destructive' : 'secondary'}
              className="uppercase text-[10px]"
            >
              {managingInvoice.status}
            </Badge>
          </div>
          <DialogDescription>
            Edite vencimento, valores, observações, dê baixa manual ou abone a fatura.
          </DialogDescription>
        </DialogHeader>

        {/* BARRA DE AÇÕES RÁPIDAS */}
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
                  updateInvoiceMutation.mutate({
                    id: managingInvoice.id,
                    status: 'paid',
                    payment_method: managingInvoice.payment_method || 'manual_admin',
                    paid_at: new Date().toISOString(),
                    notes: (managingInvoice.notes ? managingInvoice.notes + '\n' : '') + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] Baixa manual efetuada pelo administrador.`,
                  });
                }}
                disabled={updateInvoiceMutation.isPending}
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
                  updateInvoiceMutation.mutate({
                    id: managingInvoice.id,
                    status: 'paid',
                    payment_method: 'abono_cortesia',
                    discount_amount: Number(managingInvoice.total_amount),
                    paid_at: new Date().toISOString(),
                    notes: (managingInvoice.notes ? managingInvoice.notes + '\n' : '') + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] Fatura abonada pela administração.`,
                  });
                }}
                disabled={updateInvoiceMutation.isPending}
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
                  updateInvoiceMutation.mutate({
                    id: managingInvoice.id,
                    status: 'cancelled',
                    notes: (managingInvoice.notes ? managingInvoice.notes + '\n' : '') + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] Cancelada pelo administrador.`,
                  });
                }}
                disabled={updateInvoiceMutation.isPending}
                className="rounded-xl h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="size-3.5" /> Cancelar Fatura
              </Button>
            )}
          </div>
        </div>

        {/* FORMULÁRIO DE EDIÇÃO DETALHADA */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            updateInvoiceMutation.mutate({
              id: managingInvoice.id,
              status: managingInvoice.status,
              due_date: managingInvoice.due_date,
              total_amount: Number(managingInvoice.total_amount),
              subtotal: Number(managingInvoice.subtotal ?? managingInvoice.total_amount),
              discount_amount: Number(managingInvoice.discount_amount ?? 0),
              payment_method: managingInvoice.payment_method,
              paid_at: managingInvoice.paid_at,
              notes: managingInvoice.notes,
            });
          }}
          className="space-y-4 pt-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status da Fatura</Label>
              <Select 
                value={managingInvoice.status} 
                onValueChange={(val: any) => setManagingInvoice((prev: any) => ({ ...prev, status: val }))}
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Paga (Paid)</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="overdue">Vencida</SelectItem>
                  <SelectItem value="refunded">Reembolsada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data de Vencimento</Label>
              <Input 
                type="date"
                value={managingInvoice.due_date ? managingInvoice.due_date.split('T')[0] : ''}
                onChange={(e) => setManagingInvoice((prev: any) => ({ ...prev, due_date: e.target.value }))}
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor Total (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={managingInvoice.total_amount}
                onChange={(e) => setManagingInvoice((prev: any) => ({ ...prev, total_amount: e.target.value }))}
                className="rounded-xl h-10 font-bold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subtotal (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={managingInvoice.subtotal ?? managingInvoice.total_amount}
                onChange={(e) => setManagingInvoice((prev: any) => ({ ...prev, subtotal: e.target.value }))}
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Desconto (R$)</Label>
              <Input 
                type="number"
                step="0.01"
                value={managingInvoice.discount_amount ?? 0}
                onChange={(e) => setManagingInvoice((prev: any) => ({ ...prev, discount_amount: e.target.value }))}
                className="rounded-xl h-10 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Método de Pagamento</Label>
              <Select 
                value={managingInvoice.payment_method || 'manual'} 
                onValueChange={(val: any) => setManagingInvoice((prev: any) => ({ ...prev, payment_method: val }))}
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                  <SelectItem value="boleto">Boleto Bancário</SelectItem>
                  <SelectItem value="ted">TED / Transferência</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                  <SelectItem value="saldo">Saldo da Carteira</SelectItem>
                  <SelectItem value="abono_cortesia">Abono / Cortesia</SelectItem>
                  <SelectItem value="manual">Manual Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data do Pagamento</Label>
              <Input 
                type="date"
                value={managingInvoice.paid_at ? managingInvoice.paid_at.split('T')[0] : ''}
                onChange={(e) => setManagingInvoice((prev: any) => ({ 
                  ...prev, 
                  paid_at: e.target.value ? new Date(e.target.value + 'T12:00:00Z').toISOString() : null 
                }))}
                className="rounded-xl h-10 text-xs"
              />
            </div>
          </div>

          {/* ITENS DA FATURA */}
          {managingInvoice.invoice_items && managingInvoice.invoice_items.length > 0 && (
            <div className="space-y-2 p-3 rounded-2xl bg-muted/20 border">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Itens da Fatura</Label>
              <div className="space-y-1.5">
                {managingInvoice.invoice_items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-none">
                    <span className="font-medium text-foreground">{item.description} (x{item.quantity || 1})</span>
                    <span className="font-mono font-bold">R$ {Number(item.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Comentários & Observações Administrativas</Label>
            <Textarea 
              rows={3}
              placeholder="Adicione anotações sobre negociações, acordos, baixa manual ou motivo de abono..."
              value={managingInvoice.notes || ''}
              onChange={(e) => setManagingInvoice((prev: any) => ({ ...prev, notes: e.target.value }))}
              className="rounded-xl text-xs resize-y"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Fechar
            </Button>
            <Button 
              type="submit" 
              disabled={updateInvoiceMutation.isPending}
              className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
            >
              {updateInvoiceMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
