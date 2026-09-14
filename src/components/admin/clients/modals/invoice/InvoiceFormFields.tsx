import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoiceFormFieldsProps } from "./types";

export function InvoiceFormFields({
  managingInvoice,
  setManagingInvoice,
}: InvoiceFormFieldsProps) {
  return (
    <>
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
    </>
  );
}
