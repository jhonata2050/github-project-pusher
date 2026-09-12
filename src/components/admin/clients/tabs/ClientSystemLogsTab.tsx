import { Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemLogsList } from "../SystemLogsList";

interface ClientSystemLogsTabProps {
  clientId: string;
}

export function ClientSystemLogsTab({ clientId }: ClientSystemLogsTabProps) {
  return (
    <Card className="rounded-3xl border-none bg-card shadow-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="size-4 text-brand" /> Logs de Auditoria do Cliente
        </CardTitle>
        <CardDescription>Histórico detalhado de conflitos e segurança.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <SystemLogsList clientId={clientId} />
      </CardContent>
    </Card>
  );
}
