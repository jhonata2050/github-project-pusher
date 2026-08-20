import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Users, 
  Wallet, 
  Server, 
  Receipt, 
  TrendingUp, 
  ArrowUpRight, 
  Layout,
  AlertCircle,
  MessageSquare,
  Clock,
  ArrowRight,
  CheckCircle2,
  PieChart as PieChartIcon,
  Search,
  History,
  ShieldAlert
} from "lucide-react";
import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAdminStats, getLeadSourceStats } from "@/lib/dashboard-admin.functions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";





export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getAdminStats(),
    refetchInterval: 30000, // 30 segundos para dashboard admin
  });
  
  const { data: leadStats } = useQuery({
    queryKey: ["admin-lead-stats"],
    queryFn: () => getLeadSourceStats(),
  });

  const COLORS = ["#B4F461", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#64748B"];

  const filteredServices = stats?.errorServices?.filter((s: any) => {
    const search = searchTerm.toLowerCase();
    return (
      s.domain?.toLowerCase().includes(search) ||
      s.username?.toLowerCase().includes(search) ||
      s.notes?.toLowerCase().includes(search) ||
      s.error_message?.toLowerCase().includes(search) ||
      s.profiles?.full_name?.toLowerCase().includes(search) ||
      s.profiles?.email?.toLowerCase().includes(search)
    );
  }) || [];

  const getSLAStatus = (date: string) => {
    const hours = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
    if (hours > 24) return { label: "CRÍTICO (>24h)", color: "bg-red-500 text-white" };
    if (hours > 4) return { label: "ALERTA (>4h)", color: "bg-orange-500 text-white" };
    return { label: "PENDENTE", color: "bg-blue-500 text-white" };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <AppShell area="admin" breadcrumb={<span>Administração</span>}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-3xl border-border/50 animate-pulse h-28" />
          ))}
        </div>
      </AppShell>
    );
  }


function ProvisioningAuditModal({ serviceId, onClose }: { serviceId: string, onClose: () => void }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["provisioning-logs", serviceId],
    queryFn: async () => {
      const { getProvisioningLogs } = await import("@/lib/provisioning.functions");
      return getProvisioningLogs({ data: { serviceId } });
    },
    enabled: !!serviceId
  });

  return (
    <Dialog open={!!serviceId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-3xl border-none shadow-2xl max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <History className="size-6 text-brand" /> Histórico de Provisionamento
          </DialogTitle>
          <DialogDescription>
            Audit log detalhado das tentativas de ativação deste serviço.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tentativa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-[10px] whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">#{log.attempt_number}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'success' ? 'default' : log.status === 'failure' ? 'destructive' : 'secondary'} className="text-[9px] uppercase">
                          {log.status === 'success' ? 'Sucesso' : log.status === 'failure' ? 'Falha' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-red-500">{log.error_code || "—"}</TableCell>
                      <TableCell className="text-[10px] max-w-[250px] break-words">{log.error_message || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm italic">
              Nenhuma tentativa de provisionamento registrada ainda.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


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
      <div className="mt-4 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
            <p className="text-muted-foreground text-sm">
              Métricas e estatísticas globais da plataforma EQSAM CLOUD.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-background/50 border-border/50 py-1 px-3 flex items-center gap-2 rounded-full text-[10px] text-muted-foreground font-medium">
              <Clock className="size-3" />
              ATUALIZADO AGORA
            </Badge>
          </div>
        </div>

        {/* Alertas Críticos */}
        {((stats?.criticalTickets?.length ?? 0) > 0 || (stats?.errorServices?.length ?? 0) > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {(stats?.criticalTickets?.length ?? 0) > 0 && (
              <Card className="rounded-3xl border-orange-500/20 bg-orange-500/[0.02] shadow-sm overflow-hidden border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-600">
                      <MessageSquare className="size-4" />
                      Tickets Aguardando Resposta
                    </CardTitle>
                    <Badge className="bg-orange-500 text-white border-none text-[10px] font-bold">
                      {stats?.pendingTicketsCount ?? 0} PENDENTES
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="divide-y divide-orange-500/10">
                    {stats?.criticalTickets?.map((ticket: any) => (
                      <Link 
                        key={ticket.id} 
                        to="/tickets/$ticketId"
                        params={{ ticketId: ticket.id }}
                        className="flex items-center justify-between p-3 px-6 hover:bg-orange-500/5 transition-colors group"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium line-clamp-1">{ticket.subject}</span>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="font-semibold text-orange-500/70">{ticket.profiles?.full_name}</span>
                            <span>•</span>
                            <span>{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <ArrowRight className="size-4 text-orange-500/30 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(stats?.errorServices?.length ?? 0) > 0 && (
              <Card className="rounded-3xl border-red-500/20 bg-red-500/[0.02] shadow-sm overflow-hidden border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600 shrink-0">
                      <ShieldAlert className="size-4" />
                      Provisionamento & SLA
                    </CardTitle>
                    <div className="relative w-full max-w-[200px]">
                      <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Filtrar por cliente/produto..."
                        className="h-8 pl-8 text-[10px] rounded-full bg-background/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="divide-y divide-red-500/10 max-h-[400px] overflow-y-auto">
                    {filteredServices.length > 0 ? filteredServices.map((service: any) => {
                      const sla = getSLAStatus(service.updated_at);
                      return (
                        <div 
                          key={service.id} 
                          className="flex items-center justify-between p-3 px-6 hover:bg-red-500/5 transition-colors"
                        >
                          <div className="flex flex-col gap-0.5 max-w-[85%]">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold truncate">{service.domain || service.username || `#${service.id.slice(0,8)}`}</span>
                              <Badge className={cn("text-[8px] px-1.5 h-4 border-none font-black", sla.color)}>
                                {sla.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-medium">
                              <span className="text-brand font-bold uppercase">{service.profiles?.full_name}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="size-2.5" />
                                {formatDistanceToNow(new Date(service.updated_at), { addSuffix: true, locale: ptBR })}
                              </span>
                            </div>
                            <span className="text-[10px] text-red-500 font-bold line-clamp-2 leading-tight mt-1 bg-red-500/5 p-1 rounded-md border border-red-500/10">
                              {service.notes || service.error_message || "Aguardando processamento manual"}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Link 
                              to="/admin/clients/$clientId" 
                              params={{ clientId: service.user_id }}
                              className="p-1.5 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
                              title="Ver Cliente"
                            >
                              <ArrowRight className="size-4" />
                            </Link>
                            <button 
                              onClick={() => setSelectedServiceId(service.id)} 
                              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                              title="Ver Histórico"
                            >
                              <History className="size-4" />
                            </button>

                          </div>
                        </div>
                      );
                    }) : (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        Nenhuma pendência encontrada com esses filtros.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}

        {/* Estatísticas Rápidas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, i) => (
            <Card key={i} className="rounded-3xl border-border/50 shadow-sm overflow-hidden group hover:border-primary/20 transition-colors border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{card.title}</CardTitle>
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

        <div className="grid gap-6 md:grid-cols-7">
          <Card className="col-span-4 rounded-3xl border-border/50 shadow-sm overflow-hidden border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" /> Desempenho Financeiro
                  </CardTitle>
                  <CardDescription className="text-xs">Receita acumulada e mensal.</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Total Acumulado</div>
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

          <div className="col-span-3 flex flex-col gap-4">
            <Card className="rounded-3xl border-border/50 shadow-sm border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Atalhos Operacionais</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {[
                  { label: "Clientes", to: "/admin/clients", icon: Users },
                  { label: "Serviços", to: "/admin/products", icon: Server },
                  { label: "Financeiro", to: "/admin/invoices", icon: Receipt },
                  { label: "Tickets", to: "/admin/tickets", icon: MessageSquare },
                ].map((link, i) => (
                  <a
                    key={i}
                    href={link.to}
                    className="flex flex-col items-start gap-2 p-3 rounded-2xl bg-muted/30 hover:bg-primary/5 border border-border/50 transition-all group"
                  >
                    <link.icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-semibold">{link.label}</span>
                  </a>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/50 shadow-sm bg-primary/5 border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" /> Saúde do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Gateway de Pagamento</span>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10 h-5 px-2">ONLINE</Badge>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">WhatsApp API</span>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10 h-5 px-2">CONECTADO</Badge>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Base de Dados</span>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10 h-5 px-2">ESTÁVEL</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

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
                      {leadStats.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || "#888888"} />
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
        </div>
        </div>
      </div>
      {selectedServiceId && (
        <ProvisioningAuditModal 
          serviceId={selectedServiceId} 
          onClose={() => setSelectedServiceId(null)} 
        />
      )}
    </AppShell>
  );
}