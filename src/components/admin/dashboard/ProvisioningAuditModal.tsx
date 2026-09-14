import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProvisioningAuditModalProps, ProvisioningLog } from "./types";

export function ProvisioningAuditModal({ serviceId, onClose }: ProvisioningAuditModalProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["provisioning-logs", serviceId],
    queryFn: async () => {
      const { getProvisioningLogs } = await import("@/lib/provisioning.functions");
      return getProvisioningLogs({ data: { serviceId: serviceId ?? undefined } });
    },
    enabled: !!serviceId
  });

  return (
    <Dialog open={!!serviceId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-3xl border-none shadow-2xl max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <History className="size-6 text-brand" /> Histórico de Provisionamento
          </DialogTitle>
          <DialogDescription>
            Audit log detalhado das tentativas de ativação deste serviço.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tentativa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: ProvisioningLog) => {
                    const isSuccess = log.status === "success";
                    const isFailure = log.status === "failure" || log.status === "failed";
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-[10px] whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            #{log.attempt_number ?? (log.details ? log.details["attempt_number"] : undefined) ?? 1}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={isSuccess ? "default" : isFailure ? "destructive" : "secondary"} 
                            className="text-[9px] uppercase"
                          >
                            {isSuccess ? "Sucesso" : isFailure ? "Falha" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-red-500">
                          {log.error_code || (log.details ? log.details["error_code"] : undefined) || "—"}
                        </TableCell>
                        <TableCell className="text-[10px] max-w-[250px] break-words">
                          {log.error_message || log.message || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm italic">
              Nenhuma tentativa de provisionamento registrada ainda.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
