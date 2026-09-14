import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Server } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { GATEWAYS } from "@/lib/gateways";
import {
  getServers,
  createServerDA,
  testDAConnection,
  getDAPackagesList,
  updateServerDA,
  deleteServerDA,
  getSystemSettings,
  updateSystemSettings,
} from "@/lib/support.functions";
import {
  AddServerModal,
  EditServerModal,
  ExternalProviderCard,
  ServerCard,
  ServerCommandsModal,
  type ServerRow,
  type SyncResultMap,
} from "@/components/admin/servers";

export const Route = createFileRoute("/_authenticated/admin/servers")({
  component: AdminServersPage,
});

function AdminServersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerRow | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResultMap>({});
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: () => getSystemSettings(),
  });

  const { data: servers, isLoading } = useQuery({
    queryKey: ["admin-servers"],
    queryFn: () => getServers(),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (vars: Record<string, any>) => updateSystemSettings({ data: vars }),
    onSuccess: () => {
      toast.success("Configurações salvas!");
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
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

  const testMutation = useMutation({
    mutationFn: (serverId: string) => testDAConnection({ data: serverId }),
    onSuccess: (result, serverId) => {
      if (!result.success) {
        toast.error(result.error, { duration: 12_000 });
        return;
      }
      setSyncResults((current) => ({
        ...current,
        [serverId]: { packages: result.packages, syncedAt: new Date().toISOString() },
      }));
      toast.success(`Conexão validada: ${result.packageCount} pacotes encontrados.`);
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
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

  const handleSaveExternalProviders = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};
    const contaboGateway = GATEWAYS.find((g) => g.id === "contabo");
    if (contaboGateway) {
      contaboGateway.fields.forEach((f) => {
        data[f.key] = formData.get(f.key) || "";
      });
      updateSettingsMutation.mutate(data);
    }
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
            <ServerCommandsModal />

            <AddServerModal
              open={isModalOpen}
              onOpenChange={setIsModalOpen}
              onSubmit={(data) => createServerMutation.mutate(data)}
              isPending={createServerMutation.isPending}
            />
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
              <ServerCard
                key={server.id}
                server={server}
                syncResult={syncResults[server.id]}
                onTest={(id) => testMutation.mutate(id)}
                isTesting={testMutation.isPending && testMutation.variables === server.id}
                onSync={(id) => syncMutation.mutate(id)}
                isSyncing={syncMutation.isPending && syncMutation.variables === server.id}
                onEdit={(srv) => setEditingServer(srv)}
                onDelete={(id) => deleteServerMutation.mutate(id)}
                isDeleting={deleteServerMutation.isPending && deleteServerMutation.variables === server.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
            <Server className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground font-medium">Nenhum servidor configurado ainda.</p>
            <Button
              variant="link"
              className="text-brand font-bold mt-2 cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            >
              Adicionar o primeiro servidor
            </Button>
          </div>
        )}

        <EditServerModal
          server={editingServer}
          onClose={() => setEditingServer(null)}
          onSubmit={(payload) => updateServerMutation.mutate(payload)}
          isPending={updateServerMutation.isPending}
        />

        <div className="mt-12 space-y-6">
          <div className="flex items-center gap-3">
            <Server className="h-6 w-6 text-brand" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Provedores Externos</h2>
          </div>
          <p className="text-muted-foreground">
            Configure as credenciais de API para provedores de infraestrutura.
          </p>

          <form onSubmit={handleSaveExternalProviders} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {GATEWAYS.filter((g) => g.id === "contabo").map((gateway) => (
                <ExternalProviderCard key={gateway.id} gateway={gateway} settings={settings} />
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-2xl px-8 font-bold cursor-pointer"
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
