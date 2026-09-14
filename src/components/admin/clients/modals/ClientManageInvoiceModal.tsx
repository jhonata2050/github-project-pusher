import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileEdit } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { adminUpdateInvoice } from "@/lib/finance.functions";
import {
  InvoiceQuickActions,
  InvoiceFormFields,
  InvoiceItemsList,
  type ClientManageInvoiceModalProps,
} from "./invoice";

export type { ClientManageInvoiceModalProps };

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
        <InvoiceQuickActions
          managingInvoice={managingInvoice}
          onUpdateInvoice={(data) => updateInvoiceMutation.mutate(data)}
          isPending={updateInvoiceMutation.isPending}
        />

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
          <InvoiceFormFields
            managingInvoice={managingInvoice}
            setManagingInvoice={setManagingInvoice}
          />

          {/* ITENS DA FATURA */}
          <InvoiceItemsList items={managingInvoice.invoice_items} />

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
