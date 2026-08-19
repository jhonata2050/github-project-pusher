import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSystemSettings, updateSystemSettings, testWhatsApp } from "@/lib/support.functions";
import { Save, MessageSquare, Shield, User, Info, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin/whatsapp")({
  component: AdminWhatsAppPage,
});

function AdminWhatsAppPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: () => getSystemSettings(),
  });

  const [localSettings, setLocalSettings] = useState<any>({});

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        whatsapp_enabled: settings["whatsapp_enabled"] === true || settings["whatsapp_enabled"] === "true",
        whatsapp_evolution_url: settings["whatsapp_evolution_url"] || "",
        whatsapp_evolution_token: settings["whatsapp_evolution_token"] || "",
        whatsapp_evolution_instance: settings["whatsapp_evolution_instance"] || "",
        whatsapp_admin_phone: settings["whatsapp_admin_phone"] || "",
        whatsapp_notify_admin_settings: settings["whatsapp_notify_admin_settings"] || {
          system_issues: true,
          payment_failed: true,
          service_renewal: true,
          service_activation: true,
          ticket_events: true
        },
        whatsapp_notify_client_settings: settings["whatsapp_notify_client_settings"] || {
          service_activated: true,
          invoice_due: true,
          ticket_reply: true
        }
      });
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (vars: Record<string, any>) => updateSystemSettings({ data: vars }),
    onSuccess: () => {
      toast.success("Configurações de WhatsApp salvas!");
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(localSettings);
  };

  const toggleAdminSetting = (key: string) => {
    const adminSettings = { ...localSettings.whatsapp_notify_admin_settings };
    adminSettings[key] = !adminSettings[key];
    setLocalSettings({ ...localSettings, whatsapp_notify_admin_settings: adminSettings });
  };

  const toggleClientSetting = (key: string) => {
    const clientSettings = { ...localSettings.whatsapp_notify_client_settings };
    clientSettings[key] = !clientSettings[key];
    setLocalSettings({ ...localSettings, whatsapp_notify_client_settings: clientSettings });
  };

  const testWhatsAppMutation = useMutation({
    mutationFn: () => testWhatsApp(),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(res.message || "Mensagem de teste enviada com sucesso!");
      } else {
        toast.error(res?.message || "Falha no teste de conexão.");
      }
    },
    onError: (e: any) => {
      console.error(e);
      toast.error("Falha no teste: " + (e?.message || "Erro desconhecido"));
    },
  });

  if (isLoading) return <div className="h-96 flex items-center justify-center">Carregando...</div>;

  return (
    <AppShell area="admin" breadcrumb={<span>Sistema / WhatsApp e Notificações</span>}>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações de WhatsApp</h1>
            <p className="text-muted-foreground mt-2">Integração com Evolution Go para notificações automáticas.</p>
          </div>
          <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-2xl px-4">
            <Label htmlFor="whatsapp-enabled" className="cursor-pointer font-bold">Ativar Integração</Label>
            <Switch 
              id="whatsapp-enabled"
              checked={localSettings.whatsapp_enabled} 
              onCheckedChange={(val) => setLocalSettings({...localSettings, whatsapp_enabled: val})}
            />
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-3xl border-none shadow-sm h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-brand/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <CardTitle>Evolution Go API</CardTitle>
                    <CardDescription>Dados da sua instância</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>URL da Instância</Label>
                  <Input 
                    placeholder="https://sua-api.com" 
                    className="rounded-xl"
                    value={localSettings.whatsapp_evolution_url}
                    onChange={e => setLocalSettings({...localSettings, whatsapp_evolution_url: e.target.value})}
                  />
                  <p className="text-[10px] text-muted-foreground">Ex: https://evolution.seusite.com.br</p>
                </div>
                <div className="space-y-2">
                  <Label>Nome da Instância</Label>
                  <Input 
                    placeholder="HostPanel" 
                    className="rounded-xl"
                    value={localSettings.whatsapp_evolution_instance}
                    onChange={e => setLocalSettings({...localSettings, whatsapp_evolution_instance: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Token da Instância (API Key)</Label>
                  <Input 
                    type="password"
                    placeholder="Token de acesso" 
                    className="rounded-xl"
                    value={localSettings.whatsapp_evolution_token}
                    onChange={e => setLocalSettings({...localSettings, whatsapp_evolution_token: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-brand/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <CardTitle>Contato Administrativo</CardTitle>
                    <CardDescription>Para alertas de sistema</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Número de Telefone (Admin)</Label>
                  <Input 
                    placeholder="5511999999999" 
                    className="rounded-xl"
                    value={localSettings.whatsapp_admin_phone}
                    onChange={e => setLocalSettings({...localSettings, whatsapp_admin_phone: e.target.value})}
                  />
                  <div className="flex gap-2 p-3 bg-brand/5 rounded-2xl border border-brand/10">
                    <Info className="h-4 w-4 text-brand shrink-0" />
                    <p className="text-[11px] text-muted-foreground">
                      Use o formato internacional com DDI (55 para Brasil), DDD e número, sem espaços ou símbolos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-brand/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <CardTitle>Alertas Administrativos</CardTitle>
                    <CardDescription>Quais notificações o admin deve receber</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "system_issues", label: "Problemas no Sistema" },
                  { key: "payment_failed", label: "Falhas de Pagamento" },
                  { key: "service_renewal", label: "Renovações de Serviços" },
                  { key: "service_activation", label: "Novas Ativações" },
                  { key: "ticket_events", label: "Eventos de Tickets (Abertura/Atualização)" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <Label className="cursor-pointer">{item.label}</Label>
                    <Switch 
                      checked={localSettings.whatsapp_notify_admin_settings?.[item.key]}
                      onCheckedChange={() => toggleAdminSetting(item.key)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-brand/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <CardTitle>Notificações para Clientes</CardTitle>
                    <CardDescription>Comunicações enviadas aos usuários</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "service_activated", label: "Confirmação de Ativação" },
                  { key: "invoice_due", label: "Lembrete de Fatura" },
                  { key: "ticket_reply", label: "Resposta em Ticket" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <Label className="cursor-pointer">{item.label}</Label>
                    <Switch 
                      checked={localSettings.whatsapp_notify_client_settings?.[item.key]}
                      onCheckedChange={() => toggleClientSetting(item.key)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4">
            <Button 
              type="button"
              variant="outline"
              onClick={() => testWhatsAppMutation.mutate()}
              disabled={testWhatsAppMutation.isPending || !localSettings.whatsapp_enabled}
              className="rounded-2xl px-8 font-bold border-brand/20 text-brand hover:bg-brand/5 h-12"
            >
              {testWhatsAppMutation.isPending ? (
                "Testando..."
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Testar Conexão
                </>
              )}
            </Button>
            <Button 
              type="submit" 
              disabled={updateSettingsMutation.isPending} 
              className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-12 font-bold shadow-lg shadow-brand/20 h-12"
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
