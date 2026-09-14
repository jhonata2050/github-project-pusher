import { Bell, Zap } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface FinanceNotificationsTabProps {
  settings: any;
}

export function FinanceNotificationsTab({ settings }: FinanceNotificationsTabProps) {
  const whatsappAdmin = settings?.["whatsapp_notify_admin_settings"];
  const provNotify = settings?.["provisioning_notification_settings"];

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-brand" />
            <CardTitle className="text-lg">
              Notificações Administrativas (WhatsApp)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between py-2 border-b border-muted">
              <div>
                <p className="font-medium text-sm">Pagamentos Confirmados</p>
                <p className="text-[11px] text-muted-foreground">
                  Alertar quando uma fatura for paga.
                </p>
              </div>
              <Switch
                name="notify_payment_success"
                defaultChecked={whatsappAdmin?.payment_success !== false}
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-muted">
              <div>
                <p className="font-medium text-sm">Eventos de Tickets</p>
                <p className="text-[11px] text-muted-foreground">
                  Alertar novos tickets e respostas de clientes.
                </p>
              </div>
              <Switch
                name="notify_ticket_events"
                defaultChecked={whatsappAdmin?.ticket_events !== false}
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-muted">
              <div>
                <p className="font-medium text-sm text-red-600 font-bold">
                  ERROS DE PROVISIONAMENTO
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Alertar falhas no provisionamento automático (CRÍTICO).
                </p>
              </div>
              <Switch
                name="notify_provisioning_error"
                defaultChecked={whatsappAdmin?.provisioning_error !== false}
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-muted">
              <div>
                <p className="font-medium text-sm">Logs de Erros Gerais</p>
                <p className="text-[11px] text-muted-foreground">
                  Alertar qualquer falha crítica do sistema.
                </p>
              </div>
              <Switch
                name="notify_all_errors"
                defaultChecked={whatsappAdmin?.all_errors !== false}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-none shadow-sm bg-brand/5 border border-brand/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-brand" />
            <CardTitle className="text-lg">
              Canais de Alerta de Provisionamento
            </CardTitle>
          </div>
          <CardDescription>
            Defina por onde deseja receber alertas críticos de provisionamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border/50">
              <div>
                <p className="font-bold text-sm">Notificar via WhatsApp</p>
                <p className="text-[11px] text-muted-foreground">
                  Manter alertas imediatos no celular do admin.
                </p>
              </div>
              <Switch
                name="provisioning_whatsapp_enabled"
                defaultChecked={provNotify?.whatsapp_enabled !== false}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border/50">
              <div>
                <p className="font-bold text-sm">Notificar via E-mail</p>
                <p className="text-[11px] text-muted-foreground">
                  Enviar relatório técnico para o e-mail de suporte.
                </p>
              </div>
              <Switch
                name="provisioning_email_enabled"
                defaultChecked={provNotify?.email_enabled !== false}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
