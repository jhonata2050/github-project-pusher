import { TrendingUp, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatCurrency } from "./AdminStatCards";
import type { FinancialPerformanceCardProps } from "./types";

export function FinancialPerformanceCard({ totalRevenue = 0 }: FinancialPerformanceCardProps) {
  return (
    <Card className="col-span-full md:col-span-4 rounded-3xl border-border/50 shadow-sm overflow-hidden border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" /> Desempenho Financeiro
            </CardTitle>
            <CardDescription className="text-xs">Receita acumulada e mensal.</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{formatCurrency(totalRevenue)}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
              Total Acumulado
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[240px] flex items-center justify-center border-t border-dashed border-border/50 relative bg-muted/[0.02]">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-[10px] font-bold">
            <ArrowUpRight className="size-3" />
            Crescimento Constante
          </div>
          <p className="text-xs text-muted-foreground mt-2 max-w-[200px] text-center">
            Módulo de análise de crescimento mensal em desenvolvimento.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
