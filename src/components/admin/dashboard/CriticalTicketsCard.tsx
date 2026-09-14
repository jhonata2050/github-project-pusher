import { Link } from "@tanstack/react-router";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CriticalTicketsCardProps, CriticalTicket } from "./types";

export function CriticalTicketsCard({ tickets = [], pendingCount }: CriticalTicketsCardProps) {
  if (tickets.length === 0) return null;

  return (
    <Card className="rounded-3xl border-orange-500/20 bg-orange-500/[0.02] shadow-sm overflow-hidden border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-600">
            <MessageSquare className="size-4" />
            Tickets Aguardando Resposta
          </CardTitle>
          <Badge className="bg-orange-500 text-white border-none text-[10px] font-bold">
            {pendingCount ?? tickets.length} PENDENTES
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y divide-orange-500/10">
          {tickets.map((ticket: CriticalTicket) => (
            <Link 
              key={ticket.id} 
              to="/tickets/$ticketId"
              params={{ ticketId: ticket.id }}
              className="flex items-center justify-between p-3 px-6 hover:bg-orange-500/5 transition-colors group"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium line-clamp-1">{ticket.subject}</span>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-orange-500/70">
                    {ticket.profiles?.full_name || "Cliente"}
                  </span>
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
  );
}
