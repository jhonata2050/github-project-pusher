import { CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SystemHealthCard() {
  return (
    <Card className="rounded-3xl border-border/50 shadow-sm bg-primary/5 border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-4 text-primary" /> Saúde do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Gateway de Pagamento</span>
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10 h-5 px-2">
            ONLINE
          </Badge>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">WhatsApp API</span>
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10 h-5 px-2">
            CONECTADO
          </Badge>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Base de Dados</span>
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10 h-5 px-2">
            ESTÁVEL
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
