import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTicketDetails, replyTicket, updateTicketStatus } from "@/lib/support.functions";
import { useIsStaff } from "@/hooks/use-auth";
import { 
  MessageSquare, 
  Send, 
  User, 
  Shield, 
  ArrowLeft, 
  Clock, 
  AlertCircle, 
  Paperclip, 
  X, 
  CheckCircle,
  CheckCircle2,
  Hourglass,
  RotateCcw,
  Loader2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/tickets/$ticketId")({
  component: TicketDetailsPage,
});

const STATUS_MAP = {
  open: { label: "Aberto", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  in_progress: { label: "Em Análise", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  on_hold: { label: "Em Verificação", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  answered: { label: "Respondido", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "customer-reply": { label: "Aguardando Cliente", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  closed: { label: "Fechado", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
};

function TicketDetailsPage() {
  const { isStaff } = useIsStaff();
  const { ticketId } = Route.useParams();
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicketDetails({ data: ticketId }),
  });

  const replyMutation = useMutation({
    mutationFn: async ({ text, attachmentUrls }: { text: string; attachmentUrls: string[] }) => {
      return replyTicket({ data: { ticketId, message: text, attachments: attachmentUrls } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["client-tickets"] });
      setMessage("");
      setAttachments([]);
      toast.success("Resposta enviada!");
    },
    onError: (err: any) => {
      toast.error("Erro ao responder: " + err.message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: "open" | "answered" | "customer-reply" | "in_progress" | "on_hold" | "closed") =>
      updateTicketStatus({ data: { ticketId, status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["client-tickets"] });
      toast.success("Status do ticket atualizado!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar status: " + err.message);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const urls: string[] = [];
    for (const file of attachments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${ticketId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file);

      if (error) {
        console.error('Error uploading file:', error);
        throw new Error(`Erro ao fazer upload de ${file.name}`);
      }

      if (data) {
        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(filePath);
        urls.push(publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && attachments.length === 0) return;

    setUploading(true);
    try {
      const attachmentUrls = await uploadFiles();
      replyMutation.mutate({ text: message, attachmentUrls });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.messages]);

  if (isLoading) return <div className="h-96 flex items-center justify-center">Carregando ticket...</div>;
  if (!data) return <div>Ticket não encontrado</div>;

  const { ticket, messages } = data;
  const status = STATUS_MAP[ticket.status as keyof typeof STATUS_MAP] || STATUS_MAP.open;

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={isStaff ? "/admin/tickets" : "/tickets"}>
              <Button variant="outline" size="icon" className="rounded-xl border-brand/20 text-brand">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{ticket.subject}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <Badge variant="outline" className={cn("rounded-full font-bold uppercase text-[10px]", status.color)}>
                  {status.label}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Criado em {new Date(ticket.created_at || "").toLocaleString("pt-BR")}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 capitalize">
                  <AlertCircle className="h-3 w-3" /> {ticket.priority} prioridade
                </span>
              </div>
            </div>
          </div>

          {/* Ações de Status Rápidas no Cabeçalho */}
          <div className="flex items-center gap-2">
            {isStaff ? (
              <div className="flex items-center gap-2">
                <Select
                  value={ticket.status}
                  onValueChange={(val: any) => statusMutation.mutate(val)}
                  disabled={statusMutation.isPending}
                >
                  <SelectTrigger className="w-[180px] rounded-xl h-10 text-xs font-semibold bg-card border-border">
                    <SelectValue placeholder="Alterar Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="open" className="text-emerald-600 font-medium">🟢 Aberto</SelectItem>
                    <SelectItem value="in_progress" className="text-purple-600 font-medium">🟣 Em Análise</SelectItem>
                    <SelectItem value="on_hold" className="text-amber-600 font-medium">🟡 Em Verificação</SelectItem>
                    <SelectItem value="answered" className="text-blue-600 font-medium">🔵 Respondido</SelectItem>
                    <SelectItem value="customer-reply" className="text-orange-600 font-medium">🟠 Aguardando Cliente</SelectItem>
                    <SelectItem value="closed" className="text-slate-500 font-medium">⚫ Fechado</SelectItem>
                  </SelectContent>
                </Select>

                {ticket.status !== "closed" ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 text-xs h-10 gap-1.5"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("closed")}
                  >
                    <CheckCircle className="size-3.5" /> Fechar Ticket
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-xl border-primary/30 text-primary hover:bg-primary/10 text-xs h-10 gap-1.5"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("open")}
                  >
                    <RotateCcw className="size-3.5" /> Reabrir Ticket
                  </Button>
                )}
              </div>
            ) : (
              ticket.status !== "closed" && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 text-xs h-10 gap-1.5"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate("closed")}
                >
                  <CheckCircle className="size-3.5" /> Finalizar Atendimento
                </Button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden flex flex-col h-[600px] bg-card">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6 bg-muted/5">
                {messages.map((msg: any) => {
                  const isStaffMsg = msg.is_staff;
                  const isSystemMsg = msg.message?.startsWith("ℹ️ [Sistema]");
                  
                  if (isSystemMsg) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="px-4 py-1.5 rounded-full bg-secondary/80 text-[11px] text-muted-foreground border border-border/50">
                          {msg.message} • {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "w-full flex",
                        isStaffMsg ? "justify-start" : "justify-end"
                      )}
                    >
                      <div className="flex gap-3 max-w-[85%] items-end">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                          isStaffMsg ? "bg-primary text-primary-foreground border-primary order-1" : "bg-slate-100 text-slate-600 border-slate-200 order-2"
                        )}>
                          {isStaffMsg ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </div>
                        <div className={cn(
                          "flex flex-col min-w-0",
                          isStaffMsg ? "order-2 items-start" : "order-1 items-end"
                        )}>
                          <div className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm leading-snug shadow-sm",
                            isStaffMsg 
                              ? "bg-primary/10 text-foreground border border-primary/20 rounded-bl-none" 
                              : "bg-card text-foreground border border-border rounded-br-none"
                          )}>
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {msg.attachments.map((url: string, idx: number) => (
                                  <a 
                                    key={idx} 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                                  >
                                    <img src={url} alt="Attachment" className="h-20 w-20 object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className={cn(
                            "text-[10px] text-muted-foreground mt-1 px-1",
                            isStaffMsg ? "text-left font-bold text-primary" : "text-right"
                          )}>
                            {isStaffMsg ? "Equipe de suporte Eqsam" : (msg.profile?.full_name || "Cliente")} • {new Date(msg.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-border bg-card">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="relative group">
                        <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border">
                          {file.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(file)} alt="Preview" className="h-full w-full object-cover" />
                          ) : (
                            <Paperclip className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <button 
                          onClick={() => removeAttachment(idx)}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="relative flex flex-col gap-2">
                  <div className="relative">
                    <Textarea
                      placeholder={ticket.status === 'closed' ? "Este ticket está fechado. Clique em 'Reabrir Ticket' para enviar uma mensagem." : "Digite sua resposta aqui..."}
                      className="min-h-[100px] rounded-2xl border-none bg-muted/30 focus-visible:ring-primary resize-none pr-12"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={ticket.status === 'closed' || uploading}
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*,.pdf" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                      />
                      <Button 
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-muted-foreground hover:text-primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={ticket.status === 'closed' || uploading}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="submit" 
                        size="icon" 
                        className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={(!message.trim() && attachments.length === 0) || replyMutation.isPending || ticket.status === 'closed' || uploading}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </form>
                {uploading && (
                  <p className="text-[10px] text-primary animate-pulse mt-1">Enviando anexos...</p>
                )}
                {ticket.status === 'closed' && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <p className="text-center text-xs text-muted-foreground italic">Este ticket foi concluído.</p>
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => statusMutation.mutate("open")}
                      className="text-xs text-primary p-0 h-auto font-semibold"
                    >
                      Reabrir chamado
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-card">
              <CardHeader className="bg-muted/30 p-5">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Informações</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">ID do Ticket</label>
                  <p className="text-sm font-mono text-foreground break-all">#{ticket.id.slice(0, 8)}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Status Atual</label>
                  <div className="mt-1">
                    <Badge variant="outline" className={cn("rounded-full font-bold uppercase text-[10px]", status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Cliente</label>
                  <p className="text-sm font-medium text-foreground">{(ticket as any).profile?.full_name || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground">{(ticket as any).profile?.email || ""}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Aberto em</label>
                  <p className="text-sm text-foreground">{new Date(ticket.created_at || "").toLocaleDateString("pt-BR")}</p>
                </div>
              </CardContent>
            </Card>

            <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <h4 className="font-bold text-primary">Atendimento Eqsam</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As alterações de status informam o cliente em tempo real sobre o andamento e a etapa de resolução técnica.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
