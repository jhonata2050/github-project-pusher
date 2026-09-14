import { Gift, Bell, Copy } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FinanceGeneralTabProps {
  settings: any;
  defaultWebhook: string;
  onCopyWebhook: (text: string) => void;
}

export function FinanceGeneralTab({
  settings,
  defaultWebhook,
  onCopyWebhook,
}: FinanceGeneralTabProps) {
  const webhookUrl = settings?.["system_webhook_url"] || defaultWebhook;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5 text-brand" />
            <CardTitle className="text-lg">Automação de Faturamento</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-muted">
            <div className="min-w-0">
              <p className="font-medium text-sm">Suspensão Automática</p>
              <p className="text-[11px] text-muted-foreground">
                Suspender serviços com faturas vencidas há mais de 3 dias.
              </p>
            </div>
            <Switch
              name="auto_suspend"
              defaultChecked={settings?.["auto_suspend"] === true}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="min-w-0">
              <p className="font-medium text-sm">Fallback Automático</p>
              <p className="text-[11px] text-muted-foreground">
                Tentar próximo gateway da lista caso o principal falhe.
              </p>
            </div>
            <Switch
              name="payment_gateway_fallback_enabled"
              defaultChecked={settings?.["payment_gateway_fallback_enabled"] !== false}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-brand" />
            <CardTitle className="text-lg">Notificações e Webhooks</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Link de Webhook do Sistema</Label>
            <div className="flex gap-2">
              <Input
                name="system_webhook_url"
                placeholder="https://sua-url.com/api/public/webhook"
                defaultValue={webhookUrl}
                className="rounded-xl text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-xl shrink-0"
                onClick={() => onCopyWebhook(webhookUrl)}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground flex flex-col gap-1">
              <span>Vital para receber notificações de pagamentos dos gateways.</span>
              {typeof window !== "undefined" &&
                window.location.origin.includes("id-preview--") && (
                  <span className="text-amber-500 font-medium">
                    ⚠️ Você está no ambiente de desenvolvimento. Use a URL pública acima para os gateways.
                  </span>
                )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
