import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, Search, AlertCircle, Clock, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getTickets, createTicket } from "@/lib/support.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/tickets/")({
  head: () => ({
    meta: [{ title: "Meus Tickets — HostPanel" }],
  }),
  component: ClientTicketsPage,
});

const STATUS_MAP = {
  open: { label: "Aberto", color: "bg-brand/10 text-brand border-brand/20", icon: AlertCircle },
  answered: { label: "Respondido", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: CheckCircle2 },
  "customer-reply": { label: "Aguardando", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: MessageSquare },
  closed: { label: "Fechado", color: "bg-muted text-muted-foreground border-muted-foreground/20", icon: CheckCircle2 },
};

function ClientTicketsPage() {
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["client-tickets", user?.id, page],
    queryFn: () => getTickets({ data: { offset: (page - 1) * pageSize, limit: pageSize } }),
  });

  const tickets = data?.tickets ?? [];
  const totalItems = data?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const createTicketMutation = useMutation({
    mutationFn: (data: any) => createTicket({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tickets", user?.id] });
      toast.success("Ticket criado com sucesso!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error("Erro ao criar ticket: " + err.message);
    },
  });

  const handleCreateTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
      priority: (formData.get("priority") as "low" | "medium" | "high") || "medium",
    };
    createTicketMutation.mutate(data);
  };

  const filtered = tickets.filter((t) =>
    t.subject.toLowerCase().includes(term.trim().toLowerCase())
  );

  return (
    <AppShell
      area="client"
      breadcrumb={
        <>
          <span className="flex items-center gap-2">Suporte</span>
          <span>/</span>
          <span className="font-medium text-foreground">Meus Tickets</span>
        </>
      }
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suporte ao Cliente</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas solicitações de ajuda e suporte técnico.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-6">
              <Plus className="mr-2 h-4 w-4" /> Novo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Abrir Novo Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTicket} className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input id="subject" name="subject" placeholder="Ex: Problema com e-mail" required className="rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Mensagem Detalhada</Label>
                <Textarea id="message" name="message" placeholder="Descreva seu problema aqui..." required className="rounded-xl min-h-[120px]" />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={createTicketMutation.isPending} className="bg-brand text-brand-foreground w-full rounded-2xl">
                  {createTicketMutation.isPending ? "Enviando..." : "Abrir Ticket"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Pesquisar por assunto..."
          className="h-12 rounded-2xl pl-11 border-none bg-muted/50"
        />
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          [1, 2].map((i) => <div key={i} className="h-24 rounded-3xl bg-muted animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground font-medium">Você ainda não possui tickets.</p>
          </div>
        ) : (
          filtered.map((ticket) => {
            const status = STATUS_MAP[ticket.status as keyof typeof STATUS_MAP] || STATUS_MAP.open;
            const StatusIcon = status.icon;

            return (
              <div key={ticket.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-border bg-card p-4 sm:p-6 transition-all hover:shadow-[var(--shadow-card)] group hover:bg-brand/[0.02]">
                <div className="flex items-center gap-3 sm:gap-6">
                  <div className={cn("flex size-10 sm:size-12 items-center justify-center rounded-2xl shrink-0", status.color)}>
                    <StatusIcon className="size-5 sm:size-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground group-hover:text-brand transition-colors">{ticket.subject}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                       <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(ticket.updated_at || "").toLocaleDateString("pt-BR")}
                       </span>
                       <span className="capitalize">{ticket.priority} prioridade</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-4">
                  <Badge variant="outline" className={cn("rounded-full border-none px-3 py-1 text-[10px] font-bold uppercase", status.color)}>
                    {status.label}
                  </Badge>
                  <Link to="/tickets/$ticketId" params={{ ticketId: ticket.id }}>
                    <Button variant="outline" size="sm" className="rounded-xl border-brand/20 text-brand hover:bg-brand hover:text-brand-foreground font-bold">
                      Ver Detalhes
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
        <div className="flex items-center justify-between gap-4 mt-6">
          <div className="text-sm text-muted-foreground">
            Mostrando {filtered.length} de {totalItems} tickets
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4 mr-2" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Próximo <ChevronRight className="size-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
