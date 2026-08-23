import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getServers, 
  createServerDA, 
  testDAConnection, 
  getDAPackagesList, 
  updateServerDA, 
  deleteServerDA,
  getSystemSettings,
  updateSystemSettings
} from "@/lib/support.functions";

import { Plus, Server, Globe, Shield, Activity, Trash2, RefreshCw, CheckCircle2, Pencil, Wallet, ExternalLink, Save, AlertCircle, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GATEWAYS, isGatewayConfigured, type GatewayDef } from "@/lib/gateways";

export const Route = createFileRoute("/_authenticated/admin/servers")({
  component: AdminServersPage,
});

function GatewayCard({ gateway, settings }: { gateway: GatewayDef, settings: any }) {
  const [validating, setValidating] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const configured = isGatewayConfigured(gateway.id, settings as Record<string, unknown>);

  const handleTest = async () => {
    const credentials: Record<string, string> = {};
    gateway.fields.forEach((f) => {
      const el = cardRef.current?.querySelector<HTMLInputElement>(`input[name="${f.key}"]`);
      credentials[f.key] = (el?.value ?? (settings?.[f.key] as string) ?? "").trim();
    });

    const missing = gateway.required.filter((k) => !credentials[k]);
    if (missing.length > 0) {
      setTestResult({ success: false, message: "Preencha todas as credenciais obrigatórias antes de testar." });
      return;
    }

    setValidating(true);
    setTestResult(null);
    try {
      const result = await testGatewayConnection({ data: { gatewayId: gateway.id, credentials } });
      setTestResult(result);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch (e: any) {
      const message = e?.message || "Falha ao testar a conexão.";
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setValidating(false);
    }
  };


  return (
    <Card ref={cardRef} className="rounded-3xl border-none shadow-sm">
      <CardHeader className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Server className="h-5 w-5 shrink-0 text-brand" />
            <CardTitle className="truncate text-lg">{gateway.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={configured ? "default" : "secondary"}
              className="shrink-0 rounded-full text-[10px] uppercase"
            >
              {configured ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>
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

        {testResult && (
          <div
            className={`flex items-start gap-2 rounded-2xl border p-3 text-xs ${
              testResult.success
                ? "border-brand/20 bg-brand/5 text-foreground"
                : "border-destructive/20 bg-destructive/5 text-destructive"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            )}
            <span className="break-words">{testResult.message}</span>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={validating}
          className="w-full rounded-2xl border-brand/20 text-brand hover:bg-brand/5"
        >
          <Activity className={`mr-2 h-4 w-4 ${validating ? "animate-pulse" : ""}`} />
          {validating ? "Testando..." : "Testar Conexão"}
        </Button>
      </CardContent>

    </Card>
  );
}

type ServerRow = {
  id: string;
  name: string;
  hostname: string;
  ip_address: string | null;
  api_user: string;
  max_accounts: number | null;
};

function AdminServersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerRow | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, { packages: string[]; syncedAt: string }>>({});
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: () => getSystemSettings(),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (vars: Record<string, any>) => updateSystemSettings({ data: vars }),
    onSuccess: () => {
      toast.success("Configurações salvas!");
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateServerMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      name: string;
      hostname: string;
      ip_address?: string | undefined;
      api_user: string;
      api_token?: string | undefined;
      max_accounts: number;
    }) => updateServerDA({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-servers"] });
      toast.success("Servidor atualizado com sucesso!");
      setEditingServer(null);
    },
    onError: (err: Error) => toast.error("Erro ao atualizar: " + err.message),
  });

  const deleteServerMutation = useMutation({
    mutationFn: (serverId: string) => deleteServerDA({ data: serverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-servers"] });
      toast.success("Servidor removido.");
    },
    onError: (err: Error) => toast.error("Erro ao remover: " + err.message),
  });

  const handleEditServer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingServer) return;
    const formData = new FormData(e.currentTarget);
    updateServerMutation.mutate({
      id: editingServer.id,
      name: formData.get("name") as string,
      hostname: formData.get("hostname") as string,
      ip_address: (formData.get("ip_address") as string) || undefined,
      api_user: formData.get("api_user") as string,
      api_token: (formData.get("api_token") as string) || undefined,
      max_accounts: Number(formData.get("max_accounts")) || 100,
    });
  };

  const { data: servers, isLoading } = useQuery({
    queryKey: ["admin-servers"],
    queryFn: () => getServers(),
  });

  const createServerMutation = useMutation({
    mutationFn: (newServer: any) => createServerDA({ data: newServer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-servers"] });
      toast.success("Servidor adicionado com sucesso!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error("Erro ao adicionar servidor: " + err.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: (serverId: string) => testDAConnection({ data: serverId }),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error, { duration: 12_000 });
        return;
      }
      setSyncResults((current) => ({
        ...current,
        [testMutation.variables ?? ""]: { packages: result.packages, syncedAt: new Date().toISOString() },
      }));
      toast.success(`Conexão validada: ${result.packageCount} pacotes encontrados.`);
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  const syncMutation = useMutation({
    mutationFn: (serverId: string) => getDAPackagesList({ data: serverId }),
    onSuccess: (packages, serverId) => {
      setSyncResults((current) => ({
        ...current,
        [serverId]: { packages, syncedAt: new Date().toISOString() },
      }));
      queryClient.setQueryData(["da-packages", serverId], packages);
      toast.success(`${packages.length} pacotes sincronizados com sucesso.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });


  const handleAddServer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      hostname: formData.get("hostname") as string,
      ip_address: formData.get("ip_address") as string,
      api_user: formData.get("api_user") as string,
      api_token: formData.get("api_token") as string,
      max_accounts: Number(formData.get("max_accounts")) || 100,
    };
    createServerMutation.mutate(data);
  };

  return (
    <AppShell area="admin" breadcrumb={<span>Sistema / Servidores</span>}>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Servidores</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie a infraestrutura de hospedagem e provisionamento automático.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-2xl border-brand/20 text-brand">
                  <Shield className="mr-2 h-4 w-4" /> Comandos Necessários
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-none shadow-2xl max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <Shield className="h-6 w-6 text-brand" /> 
                    Configuração da Login Key
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="bg-brand/5 border border-brand/10 p-4 rounded-2xl space-y-2">
                    <h4 className="font-bold text-brand flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> Importante: Whitelist de IP
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Para que o Eqsam Cloud consiga se comunicar com seu DirectAdmin, você deve permitir o IP abaixo na sua Login Key:
                    </p>
                    <div className="flex items-center justify-between bg-background p-3 rounded-xl border border-brand/20">
                      <code className="text-brand font-mono font-bold">34.91.200.163</code>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 rounded-lg"
                        onClick={() => {
                          navigator.clipboard.writeText("34.91.200.163");
                          toast.success("IP copiado para a área de transferência!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-foreground">Configuração para SSO Seguro (Login-URL):</h4>
                    <p className="text-sm text-muted-foreground">
                      O sistema utiliza a API do DirectAdmin para delegação segura de sessões. A Login Key deve possuir as permissões necessárias para gerenciar usuários e visualizar configurações.
                    </p>
                    <div className="bg-muted/50 p-4 rounded-2xl grid grid-cols-1 gap-2 text-[13px] font-mono">
                      {[
                        "CMD_API_LOGIN_KEYS",
                        "CMD_API_SHOW_USER_CONFIG",
                        "CMD_API_PACKAGES_USER",
                        "CMD_API_ACCOUNT_USER",
                        "CMD_API_SELECT_USERS"
                      ].map(cmd => (
                        <div key={cmd} className="flex items-center gap-2 text-muted-foreground">
                          <Check className="h-3 w-3 text-brand" /> {cmd}
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl text-brand text-[11px] leading-tight">
                      <strong>Nota de Segurança:</strong> O SSO utiliza o mecanismo nativo de delegação do servidor. Se o seu servidor não suportar `api/login/url`, o login direto para clientes estará indisponível por motivos de segurança.
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-6">
                  <Plus className="mr-2 h-4 w-4" /> Novo Servidor
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Adicionar Servidor</DialogTitle>
                </DialogHeader>
              <form onSubmit={handleAddServer} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Amigável</Label>
                  <Input id="name" name="name" placeholder="Ex: BR-SERVER-01" required className="rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hostname">Hostname/IP da API</Label>
                  <Input id="hostname" name="hostname" placeholder="https://da.provedor.com:2222" required className="rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="api_user" className="flex items-center gap-2">
                    Usuário API
                    <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 border-brand/50 text-brand font-bold">Convenção: USER|KEY</Badge>
                  </Label>
                  <Input id="api_user" name="api_user" placeholder="Ex: admin|TokenEqsam" required className="rounded-xl" />
                  <p className="text-[10px] text-muted-foreground px-1">Use "usuario|nome_da_chave" para sua organização. O backend enviará o usuário real para o DirectAdmin.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="api_token">Chave de API / Senha</Label>
                  <Input id="api_token" name="api_token" type="password" required className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ip_address">IP Público</Label>
                    <Input id="ip_address" name="ip_address" placeholder="1.2.3.4" className="rounded-xl" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="max_accounts">Limite de Contas</Label>
                    <Input id="max_accounts" name="max_accounts" type="number" defaultValue="100" className="rounded-xl" />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createServerMutation.isPending} className="bg-brand text-brand-foreground w-full rounded-2xl">
                    {createServerMutation.isPending ? "Salvando..." : "Salvar Servidor"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : servers && servers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {servers.map((server) => (
              <Card key={server.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <CardHeader className="bg-brand/5 border-b border-brand/10 p-6">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-2xl bg-brand/20 flex items-center justify-center">
                      <Server className="h-5 w-5 text-brand" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-brand px-2 py-1 rounded-full bg-brand/10">
                        <Activity className="h-3 w-3" /> Configurado
                      </div>
                      {!server.api_user?.includes('|') && (
                        <Badge variant="destructive" className="text-[9px] rounded-full uppercase px-2 py-0 animate-pulse">
                          Usuário Inválido (Falta |)
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="mt-4 text-xl font-bold">{server.hostname}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Globe className="h-3 w-3" /> {server.hostname}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4" /> IP: {server.ip_address || "N/A"}
                    </span>
                    <span className="font-medium">0 / {server.max_accounts ?? 100} contas</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-brand h-2 rounded-full w-[2%]" />
                  </div>
                  {(() => {
                    const syncResult = syncResults[server.id];
                    if (!syncResult) return null;
                    return (
                    <div className="rounded-2xl border border-brand/20 bg-brand/5 p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-brand" />
                        {syncResult.packages.length} pacotes sincronizados
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground break-words">
                        {syncResult.packages.join(", ")}
                      </p>
                    </div>
                    );
                  })()}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="rounded-2xl border-brand/20 text-brand hover:bg-brand/5"
                      onClick={() => testMutation.mutate(server.id)}
                      disabled={testMutation.isPending && testMutation.variables === server.id}
                    >
                      {testMutation.isPending && testMutation.variables === server.id ? "Testando..." : "Testar Conexão"}
                    </Button>
                    <Button
                      className="rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
                      onClick={() => syncMutation.mutate(server.id)}
                      disabled={syncMutation.isPending && syncMutation.variables === server.id}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending && syncMutation.variables === server.id ? "animate-spin" : ""}`} />
                      {syncMutation.isPending && syncMutation.variables === server.id ? "Sincronizando..." : "Sincronizar pacotes"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => setEditingServer({
                        id: server.id,
                        name: server.hostname,
                        hostname: server.hostname,
                        ip_address: server.ip_address || "",
                        api_user: server.api_user || "",
                        max_accounts: server.max_accounts || 100,
                      })}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-destructive hover:bg-destructive/5"
                      onClick={() => {
                        if (confirm(`Remover o servidor ${server.hostname}?`)) deleteServerMutation.mutate(server.id);
                      }}
                      disabled={deleteServerMutation.isPending && deleteServerMutation.variables === server.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
            <Server className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground font-medium">Nenhum servidor configurado ainda.</p>
            <Button variant="link" className="text-brand font-bold mt-2" onClick={() => setIsModalOpen(true)}>Adicionar o primeiro servidor</Button>
          </div>
        )}

        <Dialog open={editingServer !== null} onOpenChange={(open) => !open && setEditingServer(null)}>
          <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Editar Servidor</DialogTitle>
            </DialogHeader>
            {editingServer && (
              <form onSubmit={handleEditServer} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Nome Amigável</Label>
                  <Input id="edit-name" name="name" defaultValue={editingServer.name} required className="rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-hostname">Hostname/IP da API</Label>
                  <Input id="edit-hostname" name="hostname" defaultValue={editingServer.hostname} required className="rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-api_user" className="flex items-center gap-2">
                    Usuário API
                    <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0">Formato: user|key</Badge>
                  </Label>
                  <Input id="edit-api_user" name="api_user" defaultValue={editingServer.api_user} required className="rounded-xl" />
                  <p className="text-[10px] text-muted-foreground px-1">Formato obrigatório: USUARIO|NOME_DA_CHAVE</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-api_token">Chave de API / Senha</Label>
                  <Input id="edit-api_token" name="api_token" type="password" placeholder="Deixe vazio para manter a atual" className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-ip_address">IP Público</Label>
                    <Input id="edit-ip_address" name="ip_address" defaultValue={editingServer.ip_address ?? ""} className="rounded-xl" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-max_accounts">Limite de Contas</Label>
                    <Input id="edit-max_accounts" name="max_accounts" type="number" defaultValue={editingServer.max_accounts ?? 100} className="rounded-xl" />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={updateServerMutation.isPending} className="bg-brand text-brand-foreground w-full rounded-2xl">
                    {updateServerMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
        <div className="mt-12 space-y-6">
          <div className="flex items-center gap-3">
            <Server className="h-6 w-6 text-brand" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Provedores Externos</h2>
          </div>
          <p className="text-muted-foreground">
            Configure as credenciais de API para provedores de infraestrutura.
          </p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data: Record<string, any> = {};
            const contaboGateway = GATEWAYS.find(g => g.id === 'contabo');
            if (contaboGateway) {
              contaboGateway.fields.forEach(f => {
                data[f.key] = formData.get(f.key) || "";
              });
              updateSettingsMutation.mutate(data);
            }
          }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {GATEWAYS.filter(g => g.id === 'contabo').map((gateway) => (
                <GatewayCard key={gateway.id} gateway={gateway} settings={settings} />
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-8 font-bold"
              >
                <Save className="mr-2 h-4 w-4" />
                {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações Externas"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
