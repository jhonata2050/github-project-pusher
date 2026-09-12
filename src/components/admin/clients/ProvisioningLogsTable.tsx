import { useQuery } from "@tanstack/react-query";
import { History, Link2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { getProvisioningLogs } from "@/lib/provisioning.functions";

export interface ProvisioningLogsTableProps {
  clientId?: string;
  serviceId?: string;
}

export function ProvisioningLogsTable({ clientId, serviceId }: ProvisioningLogsTableProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["provisioning-logs", clientId, serviceId],
    queryFn: async () => {
      return getProvisioningLogs({ data: { clientId, serviceId } });
    }
  });

  if (isLoading) return <Skeleton className="h-40 rounded-3xl" />;

  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="size-5 text-brand" /> Auditoria de Provisionamento
        </CardTitle>
        <CardDescription>Histórico técnico de tentativas de ativação de serviços.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Tentativa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs && logs.length > 0 ? logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{log.services?.products?.name}</span>
                      <span className="text-[10px] text-muted-foreground">{log.services?.domain || "Sem domínio"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">#{log.attempt_number}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'success' ? 'default' : log.status === 'failure' ? 'destructive' : 'secondary'} className="text-[10px] uppercase">
                      {log.status === 'success' ? 'Sucesso' : log.status === 'failure' ? 'Falha' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <p className="text-[10px] font-bold text-red-500 truncate" title={log.error_message}>{log.error_code || "—"}</p>
                      <p className="text-[9px] text-muted-foreground line-clamp-1">{log.error_message || "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                      console.log("Metadata:", log.metadata);
                      toast.info("Detalhes técnicos no console");
                    }}>
                      <Link2 className="size-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                    Nenhum registro de provisionamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
