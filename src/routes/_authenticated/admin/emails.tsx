import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSystemSettings, updateSystemSettings } from "@/lib/support.functions";
import { Save, Mail, Settings } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/emails")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: () => getSystemSettings(),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (vars: Record<string, any>) => updateSystemSettings({ data: vars }),
    onSuccess: () => {
      toast.success("Configurações salvas!");
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {
      smtp_host: formData.get("smtp_host"),
      smtp_port: formData.get("smtp_port"),
      smtp_user: formData.get("smtp_user"),
      smtp_pass: formData.get("smtp_pass"),
      smtp_encryption: formData.get("smtp_encryption"),
    };
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) return <div className="h-96 flex items-center justify-center">Carregando...</div>;

  return (
    <AppShell area="admin" breadcrumb={<span>Sistema / SMTP e E-mails</span>}>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações de SMTP</h1>
          <p className="text-muted-foreground mt-2">Configure o envio de e-mails usando servidor SMTP externo.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="rounded-3xl border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-brand" />
                <CardTitle>Servidor SMTP Externo</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input name="smtp_host" defaultValue={settings?.["smtp_host"]?.replace(/"/g, '')} className="rounded-xl" placeholder="smtp.exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Porta</Label>
                  <Input name="smtp_port" defaultValue={settings?.["smtp_port"]} className="rounded-xl" placeholder="587" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Usuário SMTP</Label>
                <Input name="smtp_user" defaultValue={settings?.["smtp_user"]?.replace(/"/g, '')} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Senha SMTP</Label>
                <Input name="smtp_pass" type="password" defaultValue={settings?.["smtp_pass"]?.replace(/"/g, '')} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Criptografia</Label>
                <Input name="smtp_encryption" defaultValue={settings?.["smtp_encryption"]?.replace(/"/g, '')} className="rounded-xl" placeholder="tls ou ssl" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="submit" disabled={updateSettingsMutation.isPending} className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-12 font-bold shadow-lg shadow-brand/20">
              <Save className="mr-2 h-4 w-4" /> 
              {updateSettingsMutation.isPending ? "Salvando..." : "Salvar SMTP"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
