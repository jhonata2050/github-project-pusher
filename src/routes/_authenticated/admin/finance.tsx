import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSystemSettings, updateSystemSettings } from "@/lib/support.functions";
import { Save, Wallet, Bell, Layers, Zap } from "lucide-react";
import { toast } from "sonner";
import { GATEWAYS } from "@/lib/gateways";
import {
  FinanceGeneralTab,
  FinanceGatewaysTab,
  FinancePrioritiesTab,
  FinanceNotificationsTab,
} from "@/components/admin/finance";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  head: () => ({
    meta: [
      { title: "Financeiro e Gateways — Eqsam" },
      {
        name: "description",
        content:
          "Configure gateways de pagamento, credenciais de API e automação de faturamento.",
      },
      { property: "og:title", content: "Financeiro e Gateways — Eqsam" },
      {
        property: "og:description",
        content: "Configure gateways de pagamento e automação de faturamento.",
      },
    ],
  }),
  component: AdminFinanceSettingsPage,
});

function AdminFinanceSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: () => getSystemSettings(),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (vars: Record<string, any>) =>
      updateSystemSettings({ data: vars }),
    onSuccess: () => {
      toast.success("Configurações financeiras salvas!");
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    console.log("Saving finance settings...");

    const data: Record<string, any> = {
      auto_suspend: formData.get("auto_suspend") === "on",
      auto_delete_days: Number(formData.get("auto_delete_days")) || 30,
      payment_gateway_priority:
        formData.get("payment_gateway_priority")?.toString() || "",
      gateway_priority_pix:
        formData.get("gateway_priority_pix")?.toString() || "",
      gateway_priority_credit_card:
        formData.get("gateway_priority_credit_card")?.toString() || "",
      gateway_priority_boleto:
        formData.get("gateway_priority_boleto")?.toString() || "",
      payment_gateway_fallback_enabled:
        formData.get("payment_gateway_fallback_enabled") === "on",
      system_webhook_url:
        formData.get("system_webhook_url")?.toString() || "",
      whatsapp_notify_admin_settings: {
        payment_success: formData.get("notify_payment_success") === "on",
        ticket_events: formData.get("notify_ticket_events") === "on",
        provisioning_error: formData.get("notify_provisioning_error") === "on",
        all_errors: formData.get("notify_all_errors") === "on",
      },
      provisioning_notification_settings: {
        email_enabled: formData.get("provisioning_email_enabled") === "on",
        whatsapp_enabled: formData.get("provisioning_whatsapp_enabled") === "on",
      },
    };

    // Capturar campos de todos os gateways e normalizar
    for (const gateway of GATEWAYS) {
      for (const field of gateway.fields) {
        const val = formData.get(field.key);
        if (val !== null) {
          let trimmedVal = val.toString().trim();
          // Evitar salvar placeholders literais
          if (trimmedVal.toLowerCase().includes("placeholder")) {
            trimmedVal = "";
          }
          data[field.key] = trimmedVal;
        }
      }
    }

    updateSettingsMutation.mutate(data);
  };

  if (isLoading)
    return (
      <div className="h-96 flex items-center justify-center">Carregando...</div>
    );

  const defaultWebhook =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/webhook`
      : "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado!");
  };

  return (
    <AppShell
      area="admin"
      breadcrumb={<span>Sistema / Financeiro e Gateways</span>}
    >
      <div className="space-y-8 max-w-5xl mx-auto pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Configurações Financeiras
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie automação, gateways de pagamento e notificações do
              sistema.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-4 rounded-2xl h-12 p-1 bg-secondary/50">
              <TabsTrigger value="geral" className="rounded-xl gap-2">
                <Layers className="size-4" /> Geral
              </TabsTrigger>
              <TabsTrigger value="gateways" className="rounded-xl gap-2">
                <Wallet className="size-4" /> Gateways
              </TabsTrigger>
              <TabsTrigger value="prioridades" className="rounded-xl gap-2">
                <Zap className="size-4" /> Prioridades
              </TabsTrigger>
              <TabsTrigger value="notificacoes" className="rounded-xl gap-2">
                <Bell className="size-4" /> Notificações
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="geral"
              className="space-y-6 mt-6 data-[state=inactive]:hidden"
              forceMount={true}
            >
              <FinanceGeneralTab
                settings={settings}
                defaultWebhook={defaultWebhook}
                onCopyWebhook={copyToClipboard}
              />
            </TabsContent>

            <TabsContent
              value="gateways"
              className="mt-6 data-[state=inactive]:hidden"
              forceMount={true}
            >
              <FinanceGatewaysTab settings={settings} />
            </TabsContent>

            <TabsContent
              value="prioridades"
              className="mt-6 data-[state=inactive]:hidden"
              forceMount={true}
            >
              <FinancePrioritiesTab settings={settings} />
            </TabsContent>

            <TabsContent
              value="notificacoes"
              className="mt-6 data-[state=inactive]:hidden"
              forceMount={true}
            >
              <FinanceNotificationsTab settings={settings} />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-12 font-bold shadow-lg shadow-brand/20 h-11"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateSettingsMutation.isPending
                ? "Salvando..."
                : "Salvar Configurações"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
