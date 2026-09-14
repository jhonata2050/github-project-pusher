import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet } from "lucide-react";
import type { AffiliateWithdrawModalProps } from "./types";

export function AffiliateWithdrawModal({
  open,
  onOpenChange,
  availableBalance,
  withdrawAmount,
  onWithdrawAmountChange,
  onSubmit,
  isPending,
}: AffiliateWithdrawModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            Resgatar Comissão para a Carteira
          </DialogTitle>
          <DialogDescription>
            O saldo resgatado será transferido instantaneamente para a sua Carteira de Saldo do painel e poderá ser usado para pagar ou renovar seus serviços.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Saldo disponível para resgate:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              R$ {availableBalance.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Valor do Resgate (R$):</label>
            <Input
              type="number"
              step="0.01"
              min="1"
              max={availableBalance}
              required
              value={withdrawAmount}
              onChange={(e) => onWithdrawAmountChange(e.target.value)}
              placeholder="Ex: 50.00"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {isPending ? "Processando..." : "Confirmar Transferência"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
