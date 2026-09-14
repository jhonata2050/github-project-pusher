import { Users, DollarSign, TrendingUp, Award } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { AffiliateAccount } from "@/lib/affiliates/types";

interface AffiliatesKpiCardsProps {
  affList: AffiliateAccount[];
}

export function AffiliatesKpiCards({ affList }: AffiliatesKpiCardsProps) {
  const totalSales = affList.reduce((acc: number, a: any) => acc + (Number(a.total_sales) || 0), 0);
  const totalClicks = affList.reduce((acc: number, a: any) => acc + (Number(a.total_clicks) || 0), 0);
  const totalPaid = affList.reduce((acc: number, a: any) => acc + (Number(a.paid_earnings) || 0), 0);
  const totalAvailable = affList.reduce((acc: number, a: any) => acc + (Number(a.available_balance) || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <span className="text-sm font-medium text-muted-foreground">Total de Afiliados</span>
          <Users className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{affList.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Clientes com link ativo</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <span className="text-sm font-medium text-muted-foreground">Vendas por Indicação</span>
          <TrendingUp className="w-4 h-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSales}</div>
          <p className="text-xs text-muted-foreground mt-1">De {totalClicks} cliques rastreados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <span className="text-sm font-medium text-muted-foreground">Saldo Pendente/Disponível</span>
          <DollarSign className="w-4 h-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            R$ {totalAvailable.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Aguardando resgate</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <span className="text-sm font-medium text-muted-foreground">Comissões Pagas</span>
          <Award className="w-4 h-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            R$ {totalPaid.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Transferidas para carteira</p>
        </CardContent>
      </Card>
    </div>
  );
}
