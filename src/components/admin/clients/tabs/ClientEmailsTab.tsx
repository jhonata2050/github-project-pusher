import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientEmailsTabProps {
  emailLogs?: any[];
  isLoading?: boolean;
}

export function ClientEmailsTab({ emailLogs = [], isLoading = false }: ClientEmailsTabProps) {
  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader>
        <CardTitle>Histórico de Comunicação</CardTitle>
        <CardDescription>E-mails enviados pelo sistema</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-40" /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Data</TableHead>
                  <TableHead className="whitespace-nowrap">Assunto</TableHead>
                  <TableHead className="hidden sm:table-cell whitespace-nowrap">Template</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{log.subject}</TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">{log.template_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {emailLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Nenhum log de e-mail encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
