import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function BlockedServiceAlert() {
  return (
    <Card className="rounded-3xl border-destructive/20 bg-destructive/5 border shadow-sm">
      <CardContent className="p-6 flex items-start gap-4">
        <ShieldAlert className="size-8 text-destructive shrink-0 mt-1" />
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-destructive">Acesso Bloqueado por Segurança</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Identificamos uma inconsistência ou conflito de domínio no servidor para este serviço. 
            Para garantir sua segurança e a integridade dos dados, o acesso automático ao painel foi temporariamente suspenso.
          </p>
          <div className="pt-4">
            <Button asChild variant="destructive" className="rounded-xl">
              <Link to="/tickets">Abrir Chamado de Suporte</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
