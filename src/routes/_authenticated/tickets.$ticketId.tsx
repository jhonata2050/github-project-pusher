import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTicketDetails, replyTicket } from "@/lib/support.functions";
import { useIsStaff } from "@/hooks/use-auth";
import { MessageSquare, Send, User, Shield, ArrowLeft, Clock, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tickets/$ticketId")({
  component: TicketDetailsPage,
});

const STATUS_MAP = {
  open: { label: "Aberto", color: "bg-brand/10 text-brand border-brand/20" },
  answered: { label: "Respondido", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "customer-reply": { label: "Aguardando", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  closed: { label: "Fechado", color: "bg-muted text-muted-foreground border-muted-foreground/20" },
};

function TicketDetailsPage() {
  const { isStaff } = useIsStaff();
  const { ticketId } = Route.useParams();
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicketDetails({ data: ticketId }),
  });

  const replyMutation = useMutation({
    mutationFn: (text: string) => replyTicket({ data: { ticketId, message: text } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      setMessage("");
      toast.success("Resposta enviada!");
    },
    onError: (err: any) => {
      toast.error("Erro ao responder: " + err.message);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.messages]);

  if (isLoading) return <div className="h-96 flex items-center justify-center">Carregando ticket...</div>;
  if (!data) return <div>Ticket não encontrado</div>;

  const { ticket, messages } = data;
  const status = STATUS_MAP[ticket.status as keyof typeof STATUS_MAP] || STATUS_MAP.open;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    replyMutation.mutate(message);
  };

  return (
    <AppShell 
      area={isStaff ? "admin" : "client"} 
      breadcrumb={
        <>
          <Link to={isStaff ? "/admin/tickets" : "/tickets"} className="hover:text-brand transition-colors">Tickets</Link>
          <span>/</span>
          <span className="font-medium text-foreground truncate max-w-[200px]">{ticket.subject}</span>
        </>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={isStaff ? "/admin/tickets" : "/tickets"}>
              <Button variant="outline" size="icon" className="rounded-xl border-brand/20 text-brand">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{ticket.subject}</h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className={cn("rounded-full font-bold uppercase text-[10px]", status.color)}>
                  {status.label}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Atualizado em {new Date(ticket.updated_at || "").toLocaleString("pt-BR")}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 capitalize">
                  <AlertCircle className="h-3 w-3" /> {ticket.priority} prioridade
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6 bg-muted/5">
                {messages.map((msg: any) => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex gap-4 max-w-[85%]",
                      msg.is_staff_reply ? "mr-auto" : "ml-auto flex-row-reverse"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border",
                      msg.is_staff_reply ? "bg-brand text-brand-foreground border-brand" : "bg-white text-muted-foreground border-border"
                    )}>
                      {msg.is_staff_reply ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>
                    <div className="space-y-1">
                      <div className={cn(
                        "p-3 sm:p-4 rounded-3xl text-sm leading-relaxed shadow-sm",
                        msg.is_staff_reply ? "bg-brand/10 text-foreground border border-brand/20 rounded-tl-none" : "bg-white text-foreground border border-border rounded-tr-none"
                      )}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <p className={cn(
                        "text-[10px] text-muted-foreground mt-1",
                        msg.is_staff_reply ? "text-left" : "text-right"
                      )}>
                        {msg.profile?.full_name || (msg.is_staff_reply ? "Equipe de Suporte" : "Você")} • {new Date(msg.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border bg-white">
                <form onSubmit={handleSubmit} className="relative">
                  <Textarea
                    placeholder="Digite sua resposta aqui..."
                    className="min-h-[100px] rounded-2xl border-none bg-muted/30 focus-visible:ring-brand resize-none pr-12"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={ticket.status === 'closed'}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="absolute bottom-3 right-3 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
                    disabled={!message.trim() || replyMutation.isPending || ticket.status === 'closed'}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                {ticket.status === 'closed' && (
                  <p className="text-center text-xs text-muted-foreground mt-2 italic">Este ticket está fechado para novas respostas.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 p-5">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Informações</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">ID do Ticket</label>
                  <p className="text-sm font-mono text-foreground break-all">#{ticket.id.slice(0, 8)}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Aberto em</label>
                  <p className="text-sm text-foreground">{new Date(ticket.created_at || "").toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Última Atividade</label>
                  <p className="text-sm text-foreground">{new Date(ticket.updated_at || "").toLocaleDateString("pt-BR")}</p>
                </div>
              </CardContent>
            </Card>

            <div className="bg-brand/5 rounded-3xl p-6 border border-brand/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-xl bg-brand/20 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-brand" />
                </div>
                <h4 className="font-bold text-brand">Precisa de ajuda?</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nossa equipe responde em média em até 4 horas úteis. Para urgências, utilize nosso canal de WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
