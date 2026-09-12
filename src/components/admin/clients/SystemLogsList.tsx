import { useQuery } from "@tanstack/react-query";
import { Server } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getSystemLogs } from "@/lib/system-logs.functions";

export interface SystemLogsListProps {
  clientId: string;
}

export function SystemLogsList({ clientId }: SystemLogsListProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-client-logs", clientId],
    queryFn: async () => {
      return getSystemLogs({ data: { actorId: clientId, limit: 50 } });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground italic">
        Nenhum log de auditoria registrado para este cliente.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {logs.map((log: any) => (
        <div 
          key={log.id} 
          className={cn(
            "p-4 flex flex-col gap-1.5",
            log.level === "critical" && "bg-red-500/[0.02]"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] uppercase font-bold">{log.category}</Badge>
              <Badge className={cn(
                "text-[9px] font-black border-none text-white",
                log.level === "critical" ? "bg-red-600" : log.level === "error" ? "bg-red-500" : "bg-blue-500"
              )}>
                {log.level.toUpperCase()}
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
            </span>
          </div>
          <p className="text-sm font-medium">{log.message}</p>
          {log.services && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Server className="size-3" /> {log.services.domain}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
