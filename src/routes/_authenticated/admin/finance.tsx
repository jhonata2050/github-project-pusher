import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSystemSettings, updateSystemSettings } from "@/lib/support.functions";
import { Save, Gift, Wallet, ExternalLink, Server, CheckCircle2, AlertCircle, Link, Bell, Layers, Zap, Copy } from "lucide-react";
import { toast } from "sonner";
import { GATEWAYS, METHOD_LABELS, isGatewayConfigured, type GatewayDef } from "@/lib/gateways";
import { testGatewayConnection } from "@/lib/gateway-validation.functions";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  head: () => ({
    meta: [
      { title: "Financeiro e Gateways — Eqsam" },
      { name: "description", content: "Configure gateways de pagamento, credenciais de API e automação de faturamento." },
      { property: "og:title", content: "Financeiro e Gateways — Eqsam" },
      { property: "og:description", content: "Configure gateways de pagamento e automação de faturamento." },
    ],
  }),
  component: AdminFinanceSettingsPage,
});

function GatewayCard({ gateway, settings, isVPS = false }: { gateway: GatewayDef, settings: any, isVPS?: boolean }) {
  const [validating, setValidating] = useState(false);
  const configured = isGatewayConfigured(gateway.id, settings as Record<string, unknown>);

  const handleTest = async () => {
    const form = document.querySelector("form") as HTMLFormElement;
    if (!form) return;
    
    const formData = new FormData(form);
    const credentials: Record<string, string> = {};
    
    for (const field of gateway.fields) {
      credentials[field.key] = formData.get(field.key) as string || "";
    }

    setValidating(true);
    try {
      const res = await testGatewayConnection({ data: { gatewayId: gateway.id, credentials } });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message || "Falha na validação das credenciais.");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro técnico ao tentar validar conexão.");
    } finally {
      setValidating(false);
    }
  };

  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {isVPS ? <Server className="h-5 w-5 shrink-0 text-brand" /> : <Wallet className="h-5 w-5 shrink-0 text-brand" />}
            <CardTitle className="truncate text-lg">{gateway.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-full text-[10px] px-3 gap-1"
              onClick={handleTest}
              disabled={validating}
            >
              {validating ? "..." : "Testar Conexão"}
            </Button>
            <Badge
              variant={configured ? "default" : "secondary"}
              className={`shrink-0 rounded-full text-[10px] uppercase ${configured ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-slate-100 text-slate-400'}`}
            >
              {configured ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>
        {!isVPS && (
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
        )}
        {isVPS && (
          <div className="flex items-center gap-1.5">
            <a
              href={gateway.docs}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Docs <ExternalLink className="size-3" />
            </a>
          </div>
        )}
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
              placeholder={field.placeholder || (field.secret ? "••••••••••••••••" : "")}
              defaultValue={(settings?.[field.key] as string) || ""}
              className="rounded-xl focus-visible:ring-brand"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

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
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Log para depuração (visível apenas no console do desenvolvedor)
    console.log("Saving finance settings...");
    
    const data: Record<string, any> = {
      auto_suspend: formData.get("auto_suspend") === "on",
      auto_delete_days: Number(formData.get("auto_delete_days")) || 30,
      payment_gateway_priority: formData.get("payment_gateway_priority")?.toString() || "",
      gateway_priority_pix: formData.get("gateway_priority_pix")?.toString() || "",
      gateway_priority_credit_card: formData.get("gateway_priority_credit_card")?.toString() || "",
      gateway_priority_boleto: formData.get("gateway_priority_boleto")?.toString() || "",
      payment_gateway_fallback_enabled: formData.get("payment_gateway_fallback_enabled") === "on",
      system_webhook_url: formData.get("system_webhook_url")?.toString() || "",
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

  if (isLoading) return <div className="h-96 flex items-center justify-center">Carregando...</div>;

  const defaultWebhook = typeof window !== 'undefined' 
    ? (window.location.origin.includes('id-preview--') 
        ? `https://easy-push1231231sa1d131dscxsc.lovable.app/api/public/webhook`
        : `${window.location.origin}/api/public/webhook`)
    : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado!");
  };

  return (
    <AppShell area="admin" breadcrumb={<span>Sistema / Financeiro e Gateways</span>}>
      <div className="space-y-8 max-w-5xl mx-auto pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações Financeiras</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie automação, gateways de pagamento e notificações do sistema.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl h-12 p-1 bg-secondary/50">
              <TabsTrigger value="geral" className="rounded-xl gap-2">
                <Layers className="size-4" /> Geral
              </TabsTrigger>
              <TabsTrigger value="gateways" className="rounded-xl gap-2">
                <Wallet className="size-4" /> Gateways
              </TabsTrigger>
              <TabsTrigger value="prioridades" className="rounded-xl gap-2">
                <Zap className="size-4" /> Prioridades
              </TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-6 mt-6 data-[state=inactive]:hidden" forceMount={true}>
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
                        <p className="text-[11px] text-muted-foreground">Suspender serviços com faturas vencidas há mais de 3 dias.</p>
                      </div>
                      <Switch name="auto_suspend" defaultChecked={settings?.["auto_suspend"] === true} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">Fallback Automático</p>
                        <p className="text-[11px] text-muted-foreground">Tentar próximo gateway da lista caso o principal falhe.</p>
                      </div>
                      <Switch name="payment_gateway_fallback_enabled" defaultChecked={settings?.["payment_gateway_fallback_enabled"] !== false} />
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
                          defaultValue={settings?.["system_webhook_url"] || defaultWebhook} 
                          className="rounded-xl text-xs" 
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          className="rounded-xl shrink-0"
                          onClick={() => copyToClipboard(settings?.["system_webhook_url"] || defaultWebhook)}
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex flex-col gap-1">
                        <span>Vital para receber notificações de pagamentos dos gateways.</span>
                        {typeof window !== 'undefined' && window.location.origin.includes('id-preview--') && (
                          <span className="text-amber-500 font-medium">
                            ⚠️ Você está no ambiente de desenvolvimento. Use a URL pública acima para os gateways.
                          </span>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="gateways" className="mt-6 data-[state=inactive]:hidden" forceMount={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {GATEWAYS.filter(g => g.id !== 'contabo').map((gateway) => (
                  <GatewayCard key={gateway.id} gateway={gateway} settings={settings} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="prioridades" className="mt-6 data-[state=inactive]:hidden" forceMount={true}>
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
                      <p className="text-[10px] text-muted-foreground">
                        IDs: {GATEWAYS.filter(g => g.methods.includes('pix')).map(g => g.id).join(", ")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Prioridade CARTÃO</Label>
                      <Input 
                        name="gateway_priority_credit_card" 
                        placeholder="ex: stripe,mercadopago" 
                        defaultValue={settings?.["gateway_priority_credit_card"] || ""} 
                        className="rounded-xl font-mono text-xs" 
                      />
                      <p className="text-[10px] text-muted-foreground">
                        IDs: {GATEWAYS.filter(g => g.methods.includes('credit_card')).map(g => g.id).join(", ")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Prioridade BOLETO</Label>
                      <Input 
                        name="gateway_priority_boleto" 
                        placeholder="ex: paghiper,mercadopago" 
                        defaultValue={settings?.["gateway_priority_boleto"] || ""} 
                        className="rounded-xl font-mono text-xs" 
                      />
                      <p className="text-[10px] text-muted-foreground">
                        IDs: {GATEWAYS.filter(g => g.methods.includes('boleto')).map(g => g.id).join(", ")}
                      </p>
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
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-12 font-bold shadow-lg shadow-brand/20 h-11"
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
