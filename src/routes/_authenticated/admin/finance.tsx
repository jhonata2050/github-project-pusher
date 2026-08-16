import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSystemSettings, updateSystemSettings } from "@/lib/support.functions";
import { Save, Gift, Wallet, ExternalLink, Server } from "lucide-react";
import { toast } from "sonner";
import { GATEWAYS, METHOD_LABELS, isGatewayConfigured } from "@/lib/gateways";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  head: () => ({
    meta: [
      { title: "Financeiro e Gateways — HostPanel" },
      { name: "description", content: "Configure gateways de pagamento, credenciais de API e automação de faturamento." },
      { property: "og:title", content: "Financeiro e Gateways — HostPanel" },
      { property: "og:description", content: "Configure gateways de pagamento e automação de faturamento." },
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
    mutationFn: (vars: Record<string, any>) => updateSystemSettings({ data: vars }),
    onSuccess: () => {
      toast.success("Configurações financeiras salvas!");
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {
      auto_suspend: formData.get("auto_suspend") === "on",
      auto_delete_days: Number(formData.get("auto_delete_days")) || 30,
    };
    for (const gateway of GATEWAYS) {
      for (const field of gateway.fields) {
        data[field.key] = formData.get(field.key) ?? "";
      }
    }
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) return <div className="h-96 flex items-center justify-center">Carregando...</div>;

  return (
    <AppShell area="admin" breadcrumb={<span>Sistema / Financeiro e Gateways</span>}>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações Financeiras</h1>
          <p className="text-muted-foreground mt-2">
            Cada gateway usa exatamente as credenciais exigidas pela sua documentação oficial (muitos exigem par de chaves).
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="rounded-3xl border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-brand" />
                <CardTitle>Automação de Faturamento</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-muted">
                <div className="min-w-0">
                  <p className="font-medium">Suspensão Automática</p>
                  <p className="text-xs text-muted-foreground">Suspender serviços com faturas vencidas há mais de 3 dias.</p>
                </div>
                <Switch name="auto_suspend" defaultChecked={settings?.["auto_suspend"] === true} />
              </div>
              <div className="space-y-2">
                <Label>Prazo para Deleção (dias)</Label>
                <Input name="auto_delete_days" type="number" defaultValue={settings?.["auto_delete_days"] || 30} className="rounded-xl" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {GATEWAYS.filter(g => g.id !== 'contabo').map((gateway) => {
              const configured = isGatewayConfigured(gateway.id, settings as Record<string, unknown>);
              return (
                <Card key={gateway.id} className="rounded-3xl border-none shadow-sm">
                  <CardHeader className="space-y-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Wallet className="h-5 w-5 shrink-0 text-brand" />
                        <CardTitle className="truncate text-lg">{gateway.name}</CardTitle>
                      </div>
                      <Badge
                        variant={configured ? "default" : "secondary"}
                        className="shrink-0 rounded-full text-[10px] uppercase"
                      >
                        {configured ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {gateway.methods.map((m) => (
                        <span key={m} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                          {METHOD_LABELS[m]}
                        </span>
                      ))}
                      <a
                        href={gateway.docs}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Docs <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gateway.fields.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label className="flex items-center gap-2">
                          {field.label}
                          {field.optional && <span className="text-[10px] text-muted-foreground">(opcional)</span>}
                        </Label>
                        <Input
                          name={field.key}
                          type={field.secret ? "password" : "text"}
                          placeholder={field.placeholder}
                          defaultValue={(settings?.[field.key] as string) ?? ""}
                          className="rounded-xl"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Server className="h-5 w-5 text-brand" />
              Provedores de Infraestrutura (VPS)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {GATEWAYS.filter(g => g.id === 'contabo').map((gateway) => {
                const configured = isGatewayConfigured(gateway.id, settings as Record<string, unknown>);
                return (
                  <Card key={gateway.id} className="rounded-3xl border-none shadow-sm">
                    <CardHeader className="space-y-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Wallet className="h-5 w-5 shrink-0 text-brand" />
                          <CardTitle className="truncate text-lg">{gateway.name}</CardTitle>
                        </div>
                        <Badge
                          variant={configured ? "default" : "secondary"}
                          className="shrink-0 rounded-full text-[10px] uppercase"
                        >
                          {configured ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <a
                          href={gateway.docs}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          Docs <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {gateway.fields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <Label className="flex items-center gap-2">
                            {field.label}
                            {field.optional && <span className="text-[10px] text-muted-foreground">(opcional)</span>}
                          </Label>
                          <Input
                            name={field.key}
                            type={field.secret ? "password" : "text"}
                            placeholder={field.placeholder}
                            defaultValue={(settings?.[field.key] as string) ?? ""}
                            className="rounded-xl"
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-12 font-bold shadow-lg shadow-brand/20"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
