import { Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GATEWAYS } from "@/lib/gateways";

interface FinancePrioritiesTabProps {
  settings: any;
}

export function FinancePrioritiesTab({ settings }: FinancePrioritiesTabProps) {
  const pixGateways = GATEWAYS.filter((g) => g.methods.includes("pix"))
    .map((g) => g.id)
    .join(", ");
  const cardGateways = GATEWAYS.filter((g) => g.methods.includes("credit_card"))
    .map((g) => g.id)
    .join(", ");
  const boletoGateways = GATEWAYS.filter((g) => g.methods.includes("boleto"))
    .map((g) => g.id)
    .join(", ");

  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-brand" />
          <CardTitle className="text-lg">Configurações de Prioridade</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-sm">Prioridade PIX</Label>
            <Input
              name="gateway_priority_pix"
              placeholder="ex: woovi,cajupay"
              defaultValue={settings?.["gateway_priority_pix"] || ""}
              className="rounded-xl font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">IDs: {pixGateways}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Prioridade CARTÃO</Label>
            <Input
              name="gateway_priority_credit_card"
              placeholder="ex: stripe,mercadopago"
              defaultValue={settings?.["gateway_priority_credit_card"] || ""}
              className="rounded-xl font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">IDs: {cardGateways}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Prioridade BOLETO</Label>
            <Input
              name="gateway_priority_boleto"
              placeholder="ex: paghiper,mercadopago"
              defaultValue={settings?.["gateway_priority_boleto"] || ""}
              className="rounded-xl font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">IDs: {boletoGateways}</p>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-muted">
          <Label className="text-sm">Prioridade Global (Fallback Geral)</Label>
          <Input
            name="payment_gateway_priority"
            placeholder="ex: abacatepay,cajupay,mercadopago"
            defaultValue={settings?.["payment_gateway_priority"] || ""}
            className="rounded-xl font-mono text-xs"
          />
          <p className="text-[10px] text-muted-foreground">
            Usado se a prioridade específica do método estiver vazia. Ordem de preferência para fallback.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
