import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminAdjustUserBalance } from "@/lib/wallet.functions";

interface ClientBalanceModalProps {
  clientId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientBalanceModal({ clientId, isOpen, onOpenChange }: ClientBalanceModalProps) {
  const queryClient = useQueryClient();
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState<"deposit" | "refund" | "bonus" | "adjustment">("bonus");
  const [balanceDesc, setBalanceDesc] = useState("");

  const executeAdjustBalance = useServerFn(adminAdjustUserBalance);

  const adjustBalanceMutation = useMutation({
    mutationFn: (vars: { amount: number; type: any; description: string }) =>
      executeAdjustBalance({ data: { targetUserId: clientId, ...vars } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["client-my-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["client-dashboard-stats"] });
      onOpenChange(false);
      setBalanceAmount("");
      setBalanceDesc("");
      toast.success(`Saldo ajustado com sucesso! Novo saldo: R$ ${res.newBalance.toFixed(2)}`);
    },
    onError: (err: any) => {
      toast.error(`Erro ao ajustar saldo: ${err.message}`);
    }
  });

  const handleConfirm = () => {
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    adjustBalanceMutation.mutate({
      amount,
      type: balanceType,
      description: balanceDesc || "Ajuste manual de saldo",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5 text-emerald-600" /> Ajustar Saldo do Cliente
          </DialogTitle>
          <DialogDescription>
            Adicione créditos, estornos ou bônus diretamente na carteira deste cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tipo de Ajuste</Label>
            <select
              value={balanceType}
              onChange={(e: any) => setBalanceType(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="bonus">Bônus / Cortesia (+)</option>
              <option value="deposit">Depósito Manual (+)</option>
              <option value="refund">Estorno de Fatura / Reembolso (+)</option>
              <option value="adjustment">Ajuste / Correção</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Valor (R$)</Label>
            <Input 
              type="number"
              step="0.01"
              placeholder="Ex: 50.00 (ou negativo para debitar)"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              className="rounded-xl font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Motivo / Descrição</Label>
            <Input 
              placeholder="Ex: Crédito concedido pelo suporte técnico"
              value={balanceDesc}
              onChange={(e) => setBalanceDesc(e.target.value)}
              className="rounded-xl text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button 
            disabled={adjustBalanceMutation.isPending || !balanceAmount}
            onClick={handleConfirm}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {adjustBalanceMutation.isPending ? "Salvando..." : "Confirmar Ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
