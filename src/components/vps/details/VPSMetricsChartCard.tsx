import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface VPSMetricsChartCardProps {
  period: "24h" | "7d" | "30d";
  setPeriod: (p: "24h" | "7d" | "30d") => void;
  chartData: Array<{ time: string; cpu: number; ram: number; disk: number }>;
}

export function VPSMetricsChartCard({
  period,
  setPeriod,
  chartData,
}: VPSMetricsChartCardProps) {
  return (
    <Card className="rounded-3xl border-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Histórico
          </CardTitle>
          <CardDescription className="text-xs">Métricas coletadas pelo agente</CardDescription>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
          {(["24h", "7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border) / 0.5)"
                />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "1rem",
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.3)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  name="CPU %"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorCpu)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="ram"
                  name="RAM %"
                  stroke="#84cc16"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs space-y-2">
              <Activity className="h-8 w-8 opacity-20" />
              <p>Sem dados históricos para este período</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
