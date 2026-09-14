import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TicketSidebarInfoProps } from "./types";

export function TicketSidebarInfo({ ticket, statusInfo }: TicketSidebarInfoProps) {
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 p-5">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Informações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">ID do Ticket</label>
            <p className="text-sm font-mono text-foreground break-all">#{ticket.id.slice(0, 8)}</p>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Status Atual</label>
            <div className="mt-1">
              <Badge variant="outline" className={cn("rounded-full font-bold uppercase text-[10px]", statusInfo.color)}>
                {statusInfo.label}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Cliente</label>
            <p className="text-sm font-medium text-foreground">{ticket.profile?.full_name || "Cliente"}</p>
            <p className="text-xs text-muted-foreground">{ticket.profile?.email || ""}</p>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Aberto em</label>
            <p className="text-sm text-foreground">
              {new Date(ticket.created_at || "").toLocaleDateString("pt-BR")}
            </p>
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
  );
}
