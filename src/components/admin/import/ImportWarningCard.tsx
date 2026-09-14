import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { BATCH_SIZE } from "./types";

export function ImportWarningCard() {
  return (
    <Card className="rounded-3xl border border-warning/20 bg-warning/5 shadow-sm">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <AlertCircle className="h-6 w-6 text-warning shrink-0" />
          <div className="text-sm space-y-2">
            <p className="font-bold text-warning-foreground">Importação Simplificada</p>
            <p className="text-muted-foreground">
              Você pode exportar as tabelas <strong>completas</strong> (todos os campos) do WHMCS em formato CSV. O sistema identifica automaticamente o que é necessário e envia os dados em lotes de {BATCH_SIZE} linhas, suportando arquivos grandes. Importe primeiro os Clientes, depois Serviços e Faturas.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
