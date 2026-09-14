import { Users, Server, Receipt, Wallet } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdminStatCardsProps, StatCardItem } from "./types";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function AdminStatCards({ stats }: AdminStatCardsProps) {
  const statCards: StatCardItem[] = [
    {
      title: "Total de Clientes",
      value: stats?.clients ?? 0,
      description: "Contas registradas",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Serviços Ativos",
      value: stats?.activeServices ?? 0,
      description: "VPS e outros serviços",
      icon: Server,
      color: "text-lime-500",
      bg: "bg-lime-500/10",
    },
    {
      title: "Faturas Pendentes",
      value: stats?.pendingInvoices ?? 0,
      description: "Aguardando pagamento",
      icon: Receipt,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Receita (Mês)",
      value: formatCurrency(stats?.monthRevenue ?? 0),
      description: "Total pago este mês",
      icon: Wallet,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card, i) => (
        <Card 
          key={i} 
          className="rounded-3xl border-border/50 shadow-sm overflow-hidden group hover:border-primary/20 transition-colors border"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {card.title}
            </CardTitle>
            <div className={cn(card.bg, "p-2 rounded-xl group-hover:scale-110 transition-transform")}>
              <card.icon className={cn("size-3.5", card.color)} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{card.value}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminStatCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="rounded-3xl border-border/50 animate-pulse h-28" />
      ))}
    </div>
  );
}
