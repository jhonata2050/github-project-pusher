import { Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ServiceStatusCardProps {
  service: any;
}

export function ServiceStatusCard({ service }: ServiceStatusCardProps) {
  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="size-5 text-muted-foreground" />
          Status da Conta
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Próximo Vencimento</span>
            <span className="text-sm font-semibold">
              {service.next_due_date ? new Date(service.next_due_date).toLocaleDateString("pt-BR") : "---"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Ciclo de Faturamento</span>
            <span className="text-sm font-semibold capitalize">{service.billing_cycle || "Mensal"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Data de Criação</span>
            <span className="text-sm font-semibold">
              {service.created_at ? new Date(service.created_at).toLocaleDateString("pt-BR") : "---"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
