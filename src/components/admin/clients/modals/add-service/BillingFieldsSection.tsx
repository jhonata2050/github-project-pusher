import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BillingFieldsSectionProps } from "./types";

export function BillingFieldsSection({
  newServiceBillingCycle,
  setNewServiceBillingCycle,
  newServiceStatus,
  setNewServiceStatus,
  newServiceNextDue,
  setNewServiceNextDue,
  newServiceInvoice,
  setNewServiceInvoice,
  newServiceNotes,
  setNewServiceNotes,
}: BillingFieldsSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {/* Ciclo de Faturamento */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Ciclo</Label>
          <Select value={newServiceBillingCycle} onValueChange={(val: any) => setNewServiceBillingCycle(val)}>
            <SelectTrigger className="rounded-xl h-10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="semiannually">Semestral</SelectItem>
              <SelectItem value="annually">Anual</SelectItem>
              <SelectItem value="biennially">Bienal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Status Inicial</Label>
          <Select value={newServiceStatus} onValueChange={(val: any) => setNewServiceStatus(val)}>
            <SelectTrigger className="rounded-xl h-10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Próximo Vencimento */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Próximo Vencimento</Label>
          <Input
            type="date"
            value={newServiceNextDue}
            onChange={(e) => setNewServiceNextDue(e.target.value)}
            className="rounded-xl h-10 text-xs"
          />
        </div>
      </div>

      {/* Opção de Fatura */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border">
        <div className="space-y-0.5">
          <Label className="text-xs font-semibold cursor-pointer">Gerar Fatura Correspondente</Label>
          <p className="text-[10px] text-muted-foreground">
            Cria a fatura financeira para cobrança deste serviço no financeiro do cliente.
          </p>
        </div>
        <Switch
          checked={newServiceInvoice}
          onCheckedChange={setNewServiceInvoice}
        />
      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Notas Internas (Opcional)</Label>
        <Input
          placeholder="Observações administrativas deste serviço..."
          value={newServiceNotes}
          onChange={(e) => setNewServiceNotes(e.target.value)}
          className="rounded-xl h-9 text-xs"
        />
      </div>
    </>
  );
}
