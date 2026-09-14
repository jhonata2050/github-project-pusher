import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, MousePointerClick, ArrowRightLeft, Wallet } from "lucide-react";
import type { AffiliateStatsCardsProps } from "./types";

export function AffiliateStatsCards({
  affiliate,
  onOpenWithdrawModal,
}: AffiliateStatsCardsProps) {
  const availableBalance = affiliate?.available_balance || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Cliques no Link */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <span className="text-sm font-medium text-muted-foreground">Cliques no Link</span>
          <MousePointerClick className="w-4 h-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{affiliate?.total_clicks || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Total de acessos rastreados</p>
        </CardContent>
      </Card>

      {/* Vendas Confirmadas */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <span className="text-sm font-medium text-muted-foreground">Vendas Confirmadas</span>
          <TrendingUp className="w-4 h-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{affiliate?.total_sales || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Assinaturas geradas</p>
        </CardContent>
      </Card>

      {/* Saldo Disponível */}
      <Card className="shadow-sm border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Saldo Disponível</span>
          <Wallet className="w-4 h-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            R$ {availableBalance.toFixed(2)}
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={availableBalance <= 0}
            onClick={onOpenWithdrawModal}
            className="mt-3 w-full h-8 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Resgatar para Carteira
          </Button>
        </CardContent>
      </Card>

      {/* Total Resgatado */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <span className="text-sm font-medium text-muted-foreground">Total Resgatado</span>
          <DollarSign className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">
            R$ {(affiliate?.paid_earnings || 0).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Comissões já utilizadas</p>
        </CardContent>
      </Card>
    </div>
  );
}
