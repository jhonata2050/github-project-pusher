import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getTickets } from "@/lib/support.functions";
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  component: AdminTicketsPage,
});

const STATUS_MAP = {
  open: { label: "Aberto", color: "bg-brand/10 text-brand border-brand/20", icon: AlertCircle },
  answered: { label: "Respondido", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: CheckCircle2 },
  "customer-reply": { label: "Réplica", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: MessageSquare },
  closed: { label: "Fechado", color: "bg-muted text-muted-foreground border-muted-foreground/20", icon: CheckCircle2 },
};

function AdminTicketsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", page],
    queryFn: () => getTickets({ data: { offset: (page - 1) * pageSize, limit: pageSize } }),
  });

  const tickets = data?.tickets ?? [];
  const totalItems = data?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <AppShell area="admin" breadcrumb={<span>Atendimento / Tickets</span>}>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Tickets</h1>
            <p className="text-muted-foreground mt-2">
              Responda e gerencie as solicitações de suporte de todos os clientes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-2xl border-brand/20 text-brand hover:bg-brand/5">
              <Filter className="mr-2 h-4 w-4" /> Filtros
            </Button>
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-6">
              <Plus className="mr-2 h-4 w-4" /> Novo Ticket
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por assunto, cliente ou ID..." 
            className="pl-11 rounded-2xl border-none bg-muted/50 h-12"
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const status = STATUS_MAP[ticket.status as keyof typeof STATUS_MAP] || STATUS_MAP.open;
              const StatusIcon = status.icon;

              return (
                <Link 
                  key={ticket.id}
                  to="/tickets/$ticketId" 
                  params={{ ticketId: ticket.id }}
                  search={{ fromAdmin: true }}
                  className="block group"
                >
                  <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden group-hover:bg-brand/[0.02]">
                    <CardContent className="p-0">
                      <div className="flex items-center p-6 gap-6">
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", status.color)}>
                          <StatusIcon className="h-6 w-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg truncate">{ticket.subject}</h3>
                            <Badge variant="outline" className={cn("rounded-full font-bold uppercase text-[10px]", status.color)}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {ticket.profile?.full_name || "Cliente"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(ticket.updated_at || "").toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="capitalize">{ticket.priority} prioridade</span>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center gap-2">
                           <Button variant="ghost" className="rounded-xl font-bold text-brand group-hover:bg-brand group-hover:text-brand-foreground">
                             Ver Ticket
                           </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            <div className="flex items-center justify-between gap-4 mt-6">
              <div className="text-sm text-muted-foreground">
                Mostrando {tickets.length} de {totalItems} tickets
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="size-4 mr-2" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Próximo <ChevronRight className="size-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground font-medium">Nenhum ticket encontrado.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
