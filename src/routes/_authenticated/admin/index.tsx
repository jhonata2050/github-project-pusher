import { createFileRoute } from "@tanstack/react-router";
import { 
  Users, 
  Wallet, 
  Server, 
  Receipt, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Layout
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAdminStats } from "@/lib/dashboard-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getAdminStats(),
    refetchInterval: 300000, // 5 minutos
  });

  if (isLoading) {
    return (
      <AppShell area="admin" breadcrumb={<span>Administração</span>}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-3xl border-border/50 animate-pulse h-32" />
          ))}
        </div>
      </AppShell>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const statCards = [
    {
      title: "Total de Clientes",
      value: stats?.clients || 0,
      description: "Contas registradas",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Serviços Ativos",
      value: stats?.activeServices || 0,
      description: "VPS e outros serviços",
      icon: Server,
      color: "text-lime-500",
      bg: "bg-lime-500/10",
    },
    {
      title: "Faturas Pendentes",
      value: stats?.pendingInvoices || 0,
      description: "Aguardando pagamento",
      icon: Receipt,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Receita (Mês)",
      value: formatCurrency(stats?.monthRevenue || 0),
      description: "Total pago este mês",
      icon: Wallet,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Layout className="size-4" />
          Painel Administrativo
        </span>
      }
    >
      <div className="mt-6 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">
            Métricas e estatísticas globais da plataforma EQSAM CLOUD.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, i) => (
            <Card key={i} className="rounded-3xl border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`${card.bg} p-2 rounded-xl`}>
                  <card.icon className={`size-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-7">
          <Card className="col-span-4 rounded-3xl border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="size-5 text-primary" /> Desempenho Financeiro
              </CardTitle>
              <CardDescription>Comparativo de receita acumulada e mensal.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center border-t border-dashed border-border/50 mt-2">
               <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="text-4xl font-bold text-foreground">{formatCurrency(stats?.totalRevenue || 0)}</div>
                  <div className="text-sm uppercase tracking-wider font-semibold">Receita Total Acumulada</div>
                  <div className="flex items-center gap-2 mt-4 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-xs font-bold">
                    <ArrowUpRight className="size-3" />
                    Crescimento constante
                  </div>
               </div>
            </CardContent>
          </Card>

          <Card className="col-span-3 rounded-3xl border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Atalhos Rápidos</CardTitle>
              <CardDescription>Ações frequentes de administração.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Gerenciar Produtos", to: "/admin/products" },
                { label: "Ver Faturas", to: "/admin/invoices" },
                { label: "Suporte (Tickets)", to: "/admin/tickets" },
                { label: "Configurações Globais", to: "/admin/finance" },
              ].map((link, i) => (
                <a
                  key={i}
                  href={link.to}
                  className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-border/50 transition-colors group"
                >
                  <span className="text-sm font-medium">{link.label}</span>
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
