import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Server, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Activity, 
  Box, 
  Globe, 
  Cpu, 
  HardDrive, 
  Check, 
  Play, 
  Square, 
  RotateCcw,
  Zap,
  ExternalLink
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  getCoolifyServersAdmin, 
  saveCoolifyServerAdmin, 
  deleteCoolifyServerAdmin, 
  testCoolifyConnectionAdmin,
  executeAppAction
} from "@/lib/coolify.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/coolify")({
  head: () => ({
    meta: [{ title: "Gestão de Servidores Coolify PaaS — Admin" }],
  }),
  component: AdminCoolifyPage,
});

function AdminCoolifyPage() {
  const queryClient = useQueryClient();
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<any>(null);

  // Formulário de Servidor
  const [serverName, setServerName] = useState("");
  const [serverApiUrl, setServerApiUrl] = useState("https://coolify.eqsam.cloud/api/v1");
  const [serverApiToken, setServerApiToken] = useState("");
  const [serverWildcard, setServerWildcard] = useState("eqsam.cloud");
  const [serverIsActive, setServerIsActive] = useState(true);
  const [serverMaxApps, setServerMaxApps] = useState(150);

  const { data, isLoading } = useQuery({
    queryKey: ["adminCoolifyData"],
    queryFn: () => getCoolifyServersAdmin(),
  });

  const servers = data?.servers || [];
  const applications = data?.applications || [];

  const handleOpenAddModal = () => {
    setEditingServer(null);
    setServerName("");
    setServerApiUrl("https://coolify.eqsam.cloud/api/v1");
    setServerApiToken("");
    setServerWildcard("eqsam.cloud");
    setServerIsActive(true);
    setServerMaxApps(150);
    setServerModalOpen(true);
  };

  const handleOpenEditModal = (s: any) => {
    setEditingServer(s);
    setServerName(s.name);
    setServerApiUrl(s.apiUrl);
    setServerApiToken(s.apiToken);
    setServerWildcard(s.wildcardDomain || "eqsam.cloud");
    setServerIsActive(s.isActive);
    setServerMaxApps(s.maxApplications || 150);
    setServerModalOpen(true);
  };

  const saveServerMutation = useMutation({
    mutationFn: async () => {
      return saveCoolifyServerAdmin({
        data: {
          id: editingServer?.id,
          name: serverName,
          apiUrl: serverApiUrl,
          apiToken: serverApiToken,
          wildcardDomain: serverWildcard,
          isActive: serverIsActive,
          maxApplications: Number(serverMaxApps),
        },
      });
    },
    onSuccess: () => {
      toast.success("Configuração do servidor Coolify salva com sucesso!");
      setServerModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["adminCoolifyData"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar servidor.");
    },
  });

  const deleteServerMutation = useMutation({
    mutationFn: async (serverId: string) => {
      return deleteCoolifyServerAdmin({ data: { serverId } });
    },
    onSuccess: () => {
      toast.success("Servidor removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["adminCoolifyData"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao remover servidor.");
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async ({ apiUrl, apiToken }: { apiUrl: string; apiToken: string }) => {
      return testCoolifyConnectionAdmin({ data: { apiUrl, apiToken } });
    },
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Conexão com a API do Coolify estabelecida com sucesso!");
      } else {
        toast.error(`Falha na conexão: ${res.error}`);
      }
    },
    onError: (err: any) => {
      toast.error(`Erro ao testar conexão: ${err.message}`);
    },
  });

  const appActionMutation = useMutation({
    mutationFn: async ({ appId, action }: { appId: string; action: "start" | "stop" | "restart" | "deploy" }) => {
      return executeAppAction({ data: { appId, action } });
    },
    onSuccess: (_, vars) => {
      toast.success(`Ação ${vars.action} executada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["adminCoolifyData"] });
    },
  });

  return (
    <AppShell breadcrumb="Admin / Servidores Coolify PaaS">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Servidores Coolify PaaS</h1>
            <p className="text-muted-foreground">
              Gerencie os clusters Coolify para hospedagem de Bots, APIs e containers Docker em escala.
            </p>
          </div>
          <Button onClick={handleOpenAddModal} className="rounded-xl gap-2 font-semibold">
            <Plus className="h-4 w-4" /> Adicionar Servidor Coolify
          </Button>
        </div>

        {/* Lista de Servidores Cadastrados */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {servers.length === 0 ? (
            <Card className="rounded-3xl border-dashed col-span-full p-8 text-center">
              <Server className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <CardTitle>Nenhum servidor Coolify conectado</CardTitle>
              <CardDescription className="mt-1">
                Conecte seu primeiro servidor Coolify inserindo a URL da API e o Bearer Token.
              </CardDescription>
              <Button onClick={handleOpenAddModal} className="mt-4 rounded-xl gap-2">
                <Plus className="h-4 w-4" /> Conectar Servidor
              </Button>
            </Card>
          ) : (
            servers.map((s) => (
              <Card key={s.id} className="rounded-3xl border shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.isActive ? "bg-lime-500" : "bg-muted-foreground"}`} />
                    <CardTitle className="text-base font-bold">{s.name}</CardTitle>
                  </div>
                  <Badge variant={s.isActive ? "default" : "secondary"} className="rounded-full text-[11px]">
                    {s.isActive ? "Ativo para Vendas" : "Inativo"}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p className="truncate font-mono"><strong>API:</strong> {s.apiUrl}</p>
                  <p><strong>Domínio Wildcard:</strong> <span className="font-mono text-foreground font-semibold">*.{s.wildcardDomain}</span></p>
                  <p><strong>Capacidade Máxima:</strong> {s.maxApplications} Containers</p>
                </div>

                <div className="pt-2 border-t flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs flex-1 gap-1.5"
                    onClick={() => testConnectionMutation.mutate({ apiUrl: s.apiUrl, apiToken: s.apiToken })}
                    disabled={testConnectionMutation.isPending}
                  >
                    <RefreshCw className={`h-3 w-3 ${testConnectionMutation.isPending ? "animate-spin" : ""}`} />
                    Testar API
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-xl h-8 w-8"
                    onClick={() => handleOpenEditModal(s)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-xl h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => deleteServerMutation.mutate(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Tabela de Aplicações de Todos os Clientes */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Containers em Execução ({applications.length})</CardTitle>
            <CardDescription>
              Acompanhe todas as instâncias e bots hospedados no ecossistema Eqsam PaaS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum container ativo no momento.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aplicação</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Recursos</TableHead>
                    <TableHead>Domínio / FQDN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app: any) => {
                    const isRunning = app.status === "running";
                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-semibold">{app.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{app.user?.full_name || "Cliente"}</TableCell>
                        <TableCell className="text-xs">
                          <span className="font-mono">{app.memory_limit}MB RAM</span> • {app.cpu_limit} vCPU
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          <a href={app.fqdn} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            {app.fqdn} <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isRunning ? "default" : "secondary"} className="rounded-full text-xs">
                            {isRunning ? "Online" : "Parado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {isRunning ? (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 rounded-lg text-xs text-rose-500"
                              onClick={() => appActionMutation.mutate({ appId: app.id, action: "stop" })}
                            >
                              <Square className="h-3 w-3 mr-1" /> Parar
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 rounded-lg text-xs text-lime-600"
                              onClick={() => appActionMutation.mutate({ appId: app.id, action: "start" })}
                            >
                              <Play className="h-3 w-3 mr-1" /> Iniciar
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 rounded-lg text-xs"
                            onClick={() => appActionMutation.mutate({ appId: app.id, action: "restart" })}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Reiniciar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal de Cadastro / Edição de Servidor Coolify */}
        <Dialog open={serverModalOpen} onOpenChange={setServerModalOpen}>
          <DialogContent className="rounded-3xl max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingServer ? "Editar Servidor Coolify" : "Conectar Novo Servidor Coolify"}
              </DialogTitle>
              <DialogDescription>
                Informe as credenciais da API REST do seu servidor Coolify instalado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome de Identificação</Label>
                <Input
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="Ex: Cluster Principal BR-01"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>URL da API do Coolify</Label>
                <Input
                  value={serverApiUrl}
                  onChange={(e) => setServerApiUrl(e.target.value)}
                  placeholder="https://coolify.meudominio.com/api/v1"
                  className="rounded-xl font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label>Bearer Token da API</Label>
                <Input
                  type="password"
                  value={serverApiToken}
                  onChange={(e) => setServerApiToken(e.target.value)}
                  placeholder="Token gerado no Coolify > Keys & Tokens"
                  className="rounded-xl font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label>Domínio Wildcard para Subdomínios</Label>
                <Input
                  value={serverWildcard}
                  onChange={(e) => setServerWildcard(e.target.value)}
                  placeholder="Ex: eqsam.cloud ou app.eqsam.com"
                  className="rounded-xl font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Limite de Containers</Label>
                  <Input
                    type="number"
                    value={serverMaxApps}
                    onChange={(e) => setServerMaxApps(Number(e.target.value))}
                    className="rounded-xl"
                  />
                </div>

                <div className="flex flex-col justify-end pb-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={serverIsActive}
                      onCheckedChange={setServerIsActive}
                    />
                    <Label className="text-xs">Ativo para Provisionamento</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setServerModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button 
                onClick={() => saveServerMutation.mutate()} 
                disabled={saveServerMutation.isPending || !serverName || !serverApiToken}
                className="rounded-xl font-semibold"
              >
                Salvar Servidor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
