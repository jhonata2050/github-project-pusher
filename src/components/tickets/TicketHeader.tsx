import { Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, AlertCircle, CheckCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TicketHeaderProps, TicketStatusType } from "./types";

export function TicketHeader({
  ticket,
  isStaff,
  statusInfo,
  isStatusPending,
  onUpdateStatus,
}: TicketHeaderProps) {
  return (
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
            <Badge variant="outline" className={cn("rounded-full font-bold uppercase text-[10px]", statusInfo.color)}>
              {statusInfo.label}
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
              value={ticket.status || "open"}
              onValueChange={(val: TicketStatusType) => onUpdateStatus(val)}
              disabled={isStatusPending}
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
                disabled={isStatusPending}
                onClick={() => onUpdateStatus("closed")}
              >
                <CheckCircle className="size-3.5" /> Fechar Ticket
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-xl border-primary/30 text-primary hover:bg-primary/10 text-xs h-10 gap-1.5"
                disabled={isStatusPending}
                onClick={() => onUpdateStatus("open")}
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
              disabled={isStatusPending}
              onClick={() => onUpdateStatus("closed")}
            >
              <CheckCircle className="size-3.5" /> Finalizar Atendimento
            </Button>
          )
        )}
      </div>
    </div>
  );
}
