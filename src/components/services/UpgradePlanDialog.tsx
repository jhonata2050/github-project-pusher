import { useState } from "react";
import { Sparkles, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  upgradeData: any;
  onConfirmUpgrade: (targetProductId: string) => void;
  isPending: boolean;
}

export function UpgradePlanDialog({
  open,
  onOpenChange,
  isLoading,
  upgradeData,
  onConfirmUpgrade,
  isPending,
}: UpgradePlanDialogProps) {
  const [selectedUpgradeProduct, setSelectedUpgradeProduct] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm">
          <Sparkles className="size-4" />
          Fazer Upgrade de Plano
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" /> Upgrade de Plano
          </DialogTitle>
          <DialogDescription>
            Migre para um plano superior pagando apenas o valor proporcional (Prorata) dos dias restantes.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 space-y-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : upgradeData?.availableUpgrades && upgradeData.availableUpgrades.length > 0 ? (
          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="p-3 bg-secondary/40 rounded-xl text-xs flex justify-between items-center text-muted-foreground">
              <span>
                Plano Atual:{" "}
                <strong className="text-foreground">
                  {upgradeData.service.currentProduct.name}
                </strong>
              </span>
              <span>
                Dias restantes no ciclo:{" "}
                <strong className="text-foreground">
                  {upgradeData.service.daysRemaining} dias
                </strong>
              </span>
            </div>

            <div className="space-y-3">
              {upgradeData.availableUpgrades.map((pkg: any) => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedUpgradeProduct(pkg.id)}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
                    selectedUpgradeProduct === pkg.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 bg-card"
                  )}
                >
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      {pkg.name}
                      {selectedUpgradeProduct === pkg.id && (
                        <CheckCircle2 className="size-4 text-primary" />
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pkg.description || "Recursos expandidos"}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {pkg.directadminPackage && (
                        <Badge variant="outline" className="text-[10px] rounded-md">
                          Pacote: {pkg.directadminPackage}
                        </Badge>
                      )}
                      {pkg.cpuCores && (
                        <Badge variant="outline" className="text-[10px] rounded-md">
                          {pkg.cpuCores} vCPU
                        </Badge>
                      )}
                      {pkg.ramGb && (
                        <Badge variant="outline" className="text-[10px] rounded-md">
                          {pkg.ramGb} GB RAM
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-right sm:self-center shrink-0">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">
                      Pagar agora (Prorata)
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {brl.format(pkg.prorataAmount)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Novo valor: {brl.format(pkg.targetPrice)}/mês
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                disabled={!selectedUpgradeProduct || isPending}
                onClick={() =>
                  selectedUpgradeProduct && onConfirmUpgrade(selectedUpgradeProduct)
                }
                className="rounded-xl bg-primary text-primary-foreground gap-2"
              >
                {isPending ? "Gerando Fatura..." : "Confirmar Upgrade"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground space-y-3">
            <CheckCircle2 className="size-10 text-lime-600 mx-auto opacity-70" />
            <p className="text-sm font-medium">Você já está no melhor plano disponível!</p>
            <p className="text-xs">Não há opções de upgrade superiores para este serviço no momento.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
