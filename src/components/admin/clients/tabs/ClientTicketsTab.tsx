import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientTicketsTabProps {
  tickets?: any[];
  isLoading?: boolean;
}

export function ClientTicketsTab({ tickets = [], isLoading = false }: ClientTicketsTabProps) {
  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader>
        <CardTitle>Suporte</CardTitle>
        <CardDescription>Tickets abertos e resolvidos</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-40" /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Assunto</TableHead>
                  <TableHead className="hidden sm:table-cell whitespace-nowrap">Data</TableHead>
                  <TableHead className="hidden md:table-cell whitespace-nowrap">Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.subject}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {format(new Date(t.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{t.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'open' ? 'default' : 'secondary'}>
                        {t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {tickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Nenhum ticket encontrado</TableCell>
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
