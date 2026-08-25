import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTickets, updateTicketStatus } from "@/lib/support.functions";
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RotateCcw,
  CheckCircle,
  Hourglass,
  HelpCircle,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  component: AdminTicketsPage,
});

export const STATUS_MAP = {
  open: { label: "Aberto", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: AlertCircle },
  in_progress: { label: "Em Análise", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: Loader2 },
  on_hold: { label: "Em Verificação", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Hourglass },
  answered: { label: "Respondido", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: CheckCircle2 },
  "customer-reply": { label: "Aguardando Cliente", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: MessageSquare },
  closed: { label: "Fechado", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: CheckCircle },
};

const STATUS_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "open", label: "Abertos" },
  { id: "in_progress", label: "Em Análise" },
  { id: "on_hold", label: "Em Verificação" },
  { id: "answered", label: "Respondidos" },
  { id: "customer-reply", label: "Aguardando Cliente" },
  { id: "closed", label: "Fechados" },
];

function AdminTicketsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", page, selectedStatus],
    queryFn: () => getTickets({ 
      data: { 
        offset: (page - 1) * pageSize, 
        limit: pageSize,
        status: selectedStatus === "all" ? undefined : selectedStatus 
      } 
    }),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { ticketId: string; status: "open" | "answered" | "customer-reply" | "in_progress" | "on_hold" | "closed" }) =>
      updateTicketStatus({ data: input }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", vars.ticketId] });
      toast.success("Status do ticket atualizado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao alterar status: ${err.message}`);
    }
  });

  const rawTickets = data?.tickets ?? [];
  const totalItems = data?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const filteredTickets = rawTickets.filter((t: any) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const subject = (t.subject || "").toLowerCase();
    const id = (t.id || "").toLowerCase();
    const user = (t.user_id || "").toLowerCase();
    return subject.includes(term) || id.includes(term) || user.includes(term);
  });

  return (
    <AppShell area="admin" breadcrumb={<span>Atendimento / Tickets</span>}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Tickets</h1>
            <p className="text-muted-foreground mt-1">
              Responda, altere status (análise, verificação) e finalize solicitações de suporte.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              asChild
              className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-5 gap-2 shadow-sm"
            >
              <Link to="/tickets">
                <Plus className="h-4 w-4" /> Abrir Chamado
              </Link>
            </Button>
          </div>
        </div>

        {/* Filtros por Abas de Status (Estilo WHMCS) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setSelectedStatus(f.id);
                setPage(1);
              }}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap",
                selectedStatus === f.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por assunto, cliente ou ID..." 
            className="pl-11 rounded-2xl border-none bg-muted/50 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredTickets && filteredTickets.length > 0 ? (
          <div className="space-y-3">
            {filteredTickets.map((ticket: any) => {
              const status = STATUS_MAP[ticket.status as keyof typeof STATUS_MAP] || STATUS_MAP.open;
              const StatusIcon = status.icon;

              return (
                <div 
                  key={ticket.id}
                  className="block group"
                >
                  <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-card hover:bg-secondary/20">
                    <CardContent className="p-0">
                      <div className="flex items-center p-4 sm:p-5 gap-4">
                        <div 
                          onClick={() => navigate({ to: "/tickets/$ticketId", params: { ticketId: ticket.id } })}
                          className={cn("h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer", status.color)}
                        >
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        
                        <div 
                          onClick={() => navigate({ to: "/tickets/$ticketId", params: { ticketId: ticket.id } })}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-base truncate text-foreground group-hover:text-primary transition-colors">
                              {ticket.subject}
                            </h3>
                            <Badge variant="outline" className={cn("rounded-full font-bold uppercase text-[10px] px-2.5 py-0.5", status.color)}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="font-mono text-[11px] text-foreground font-semibold">
                              #{ticket.id.slice(0, 8)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(ticket.created_at || "").toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="capitalize">{ticket.priority} prioridade</span>
                          </div>
                        </div>

                        {/* Menu de Ações Rápidas (WHMCS Style) */}
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate({ to: "/tickets/$ticketId", params: { ticketId: ticket.id } })}
                            className="rounded-xl font-semibold text-primary hover:bg-primary/10 hidden sm:inline-flex"
                          >
                            Atender
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-foreground">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
                              <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">Mudar Status</DropdownMenuLabel>
                              <DropdownMenuItem 
                                onClick={() => statusMutation.mutate({ ticketId: ticket.id, status: "open" })}
                                className="rounded-xl text-xs gap-2 cursor-pointer text-emerald-600 font-medium"
                              >
                                <AlertCircle className="size-3.5" /> Aberto
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => statusMutation.mutate({ ticketId: ticket.id, status: "in_progress" })}
                                className="rounded-xl text-xs gap-2 cursor-pointer text-purple-600 font-medium"
                              >
                                <Loader2 className="size-3.5" /> Em Análise
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => statusMutation.mutate({ ticketId: ticket.id, status: "on_hold" })}
                                className="rounded-xl text-xs gap-2 cursor-pointer text-amber-600 font-medium"
                              >
                                <Hourglass className="size-3.5" /> Em Verificação
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => statusMutation.mutate({ ticketId: ticket.id, status: "answered" })}
                                className="rounded-xl text-xs gap-2 cursor-pointer text-blue-600 font-medium"
                              >
                                <CheckCircle2 className="size-3.5" /> Respondido
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {ticket.status !== "closed" ? (
                                <DropdownMenuItem 
                                  onClick={() => statusMutation.mutate({ ticketId: ticket.id, status: "closed" })}
                                  className="rounded-xl text-xs gap-2 cursor-pointer text-destructive font-medium"
                                >
                                  <CheckCircle className="size-3.5" /> Fechar Ticket
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => statusMutation.mutate({ ticketId: ticket.id, status: "open" })}
                                  className="rounded-xl text-xs gap-2 cursor-pointer text-primary font-medium"
                                >
                                  <RotateCcw className="size-3.5" /> Reabrir Ticket
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}

            <div className="flex items-center justify-between gap-4 mt-6">
              <div className="text-xs text-muted-foreground">
                Mostrando {filteredTickets.length} de {totalItems} tickets
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-8 text-xs"
                  onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="size-3.5 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-8 text-xs"
                  onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Próximo <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-3 opacity-30" />
            <p className="text-muted-foreground font-medium text-sm">Nenhum ticket encontrado para este filtro.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
