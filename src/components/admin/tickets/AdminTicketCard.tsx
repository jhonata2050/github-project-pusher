import { 
  Clock, 
  MoreVertical, 
  AlertCircle, 
  Loader2, 
  Hourglass, 
  CheckCircle2, 
  CheckCircle, 
  RotateCcw 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_MAP, type TicketStatus } from "./types";

interface AdminTicketCardProps {
  ticket: any;
  onNavigate: (ticketId: string) => void;
  onUpdateStatus: (ticketId: string, status: TicketStatus) => void;
}

export function AdminTicketCard({
  ticket,
  onNavigate,
  onUpdateStatus,
}: AdminTicketCardProps) {
  const status = STATUS_MAP[ticket.status as keyof typeof STATUS_MAP] || STATUS_MAP.open;
  const StatusIcon = status.icon;

  return (
    <div className="block group">
      <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-card hover:bg-secondary/20">
        <CardContent className="p-0">
          <div className="flex items-center p-4 sm:p-5 gap-4">
            <div 
              onClick={() => onNavigate(ticket.id)}
              className={cn("h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer", status.color)}
            >
              <StatusIcon className="h-5 w-5" />
            </div>
            
            <div 
              onClick={() => onNavigate(ticket.id)}
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
                onClick={() => onNavigate(ticket.id)}
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
                    onClick={() => onUpdateStatus(ticket.id, "open")}
                    className="rounded-xl text-xs gap-2 cursor-pointer text-emerald-600 font-medium"
                  >
                    <AlertCircle className="size-3.5" /> Aberto
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onUpdateStatus(ticket.id, "in_progress")}
                    className="rounded-xl text-xs gap-2 cursor-pointer text-purple-600 font-medium"
                  >
                    <Loader2 className="size-3.5" /> Em Análise
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onUpdateStatus(ticket.id, "on_hold")}
                    className="rounded-xl text-xs gap-2 cursor-pointer text-amber-600 font-medium"
                  >
                    <Hourglass className="size-3.5" /> Em Verificação
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onUpdateStatus(ticket.id, "answered")}
                    className="rounded-xl text-xs gap-2 cursor-pointer text-blue-600 font-medium"
                  >
                    <CheckCircle2 className="size-3.5" /> Respondido
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {ticket.status !== "closed" ? (
                    <DropdownMenuItem 
                      onClick={() => onUpdateStatus(ticket.id, "closed")}
                      className="rounded-xl text-xs gap-2 cursor-pointer text-destructive font-medium"
                    >
                      <CheckCircle className="size-3.5" /> Fechar Ticket
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem 
                      onClick={() => onUpdateStatus(ticket.id, "open")}
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
}
