import { PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { LeadSourceChartCardProps, LeadSourceStatItem } from "./types";

const CHART_COLORS = ["#B4F461", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#64748B"];

export function LeadSourceChartCard({ leadStats }: LeadSourceChartCardProps) {
  return (
    <Card className="col-span-full lg:col-span-3 rounded-3xl border-border/50 shadow-sm border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PieChartIcon className="size-4 text-primary" /> Origem dos Clientes
        </CardTitle>
        <CardDescription className="text-xs">Distribuição de como os clientes nos conheceram.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {leadStats && leadStats.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={leadStats}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {leadStats.map((_entry: LeadSourceStatItem, index: number) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length] || "#888888"} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            Aguardando dados...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
