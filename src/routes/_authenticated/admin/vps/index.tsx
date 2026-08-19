import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  getVPSAdminData, 
  updateVPSInstance, 
  syncContaboInstancesFn, 
  assignInstanceToClient,
  updateVPSSSHDetails 
} from '@/lib/vps-admin.functions';
import { AppShell } from '@/components/app/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useState } from 'react';
import { Monitor, Save, RefreshCw, Link as LinkIcon, Power, PowerOff, RotateCcw, Search, UserPlus, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { contaboAction } from '@/lib/vps.functions';
import { cn } from "@/lib/utils";

export const Route = createFileRoute('/_authenticated/admin/vps/')({
  component: AdminVPSPage,
});

function AdminVPSPage() {
  const { data: instances } = useSuspenseQuery({
    queryKey: ['admin-vps-instances'],
    queryFn: () => getVPSAdminData(),
  });

  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSSHModal, setShowSSHModal] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [sshValues, setSSHValues] = useState<any>({});
  
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedExternalInstance, setSelectedExternalInstance] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const { data: externalInstances, isLoading: isSyncing, refetch: syncContabo } = useQuery({
    queryKey: ['contabo-external-instances'],
    queryFn: () => syncContaboInstancesFn(),
    enabled: false
  });

  const { data: clients } = useQuery({
    queryKey: ['admin-clients-simple'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name')
        .limit(500);
      return data || [];
    },
    // Lista só é usada no modal de vinculação
    enabled: isAssignModalOpen,
    staleTime: 1000 * 60 * 10,
  });

  const { data: clientServices } = useQuery({
    queryKey: ['admin-client-services', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const { data } = await supabase
        .from('services')
        .select(`
          id, 
          domain, 
          status,
          products(name, product_type)
        `)
        .eq('user_id', selectedClientId);
      
      // Filtramos no cliente para garantir que mostramos o que é relevante
      return (data || []).filter(s => 
        (s.products as any)?.product_type === 'vps' || 
        s.status === 'pending' || 
        s.status === 'active'
      );
    },
    enabled: !!selectedClientId
  });

  const updateMutation = useMutation({
    mutationFn: (vars: any) => updateVPSInstance({ data: vars }),
    onSuccess: () => {
      toast.success('VPS atualizada com sucesso!');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-vps-instances'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const assignMutation = useMutation({
    mutationFn: (vars: any) => assignInstanceToClient({ data: vars }),
    onSuccess: () => {
      toast.success('Servidor vinculado ao cliente com sucesso!');
      setIsAssignModalOpen(false);
      setIsSyncModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-vps-instances'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const sshMutation = useMutation({
    mutationFn: (vars: any) => updateVPSSSHDetails({ data: vars }),
    onSuccess: () => {
      toast.success('Dados SSH atualizados!');
      setShowSSHModal(null);
      queryClient.invalidateQueries({ queryKey: ['admin-vps-instances'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const actionMutation = useMutation({
    mutationFn: (vars: { instanceId: string; action: 'start' | 'stop' | 'restart' | 'reinstall' }) => 
      contaboAction({ data: vars }),
    onSuccess: (_, vars) => {
      toast.success(`Ação ${vars.action} enviada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['admin-vps-instances'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleEdit = (vps: any) => {
    setEditingId(vps.id);
    setEditValues({
      id: vps.id,
      external_id: vps.external_id,
      ip_address: vps.ip_address,
      status: vps.status
    });
  };

  const handleSyncClick = () => {
    setIsSyncModalOpen(true);
    syncContabo();
  };

  const handleAssignClick = (instance: any) => {
    setSelectedExternalInstance(instance);
    setIsAssignModalOpen(true);
  };

  const handleSSHClick = (vps: any) => {
    setShowSSHModal(vps.id);
    setSSHValues({
      id: vps.id,
      ssh_host: vps.ssh_host || vps.ip_address || '',
      ssh_port: vps.ssh_port || 22,
      ssh_user: vps.ssh_user || 'root',
      ssh_password: vps.ssh_password || ''
    });
  };

  return (
    <AppShell breadcrumb="Admin VPS">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de VPS</h1>
            <p className="text-muted-foreground">Monitore e gerencie todas as instâncias VPS dos clientes.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSyncClick} className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
              <RefreshCw className={cn("mr-2 size-4", isSyncing && "animate-spin")} />
              Sincronizar Contabo
            </Button>
          </div>
        </div>

        <Card className="rounded-3xl border-2">
          <CardHeader>
            <CardTitle>Instâncias Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>External ID</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances?.map((vps: any) => (
                  <TableRow key={vps.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{vps.service?.profile?.full_name}</span>
                        <span className="text-xs text-muted-foreground">{vps.service?.profile?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingId === vps.id ? (
                        <Input 
                          value={editValues.external_id} 
                          onChange={e => setEditValues({...editValues, external_id: e.target.value})}
                          className="h-8 w-32 rounded-lg"
                        />
                      ) : (
                        <code className="text-xs bg-muted px-1 rounded">{vps.external_id}</code>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === vps.id ? (
                        <Input 
                          value={editValues.ip_address} 
                          onChange={e => setEditValues({...editValues, ip_address: e.target.value})}
                          className="h-8 w-32 rounded-lg"
                        />
                      ) : (
                        vps.ip_address || 'Pendente'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={vps.status === 'active' ? 'outline' : 'secondary'} className={vps.status === 'active' ? 'border-lime-500 text-lime-600' : ''}>
                        {vps.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {editingId === vps.id ? (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-lime-600"
                            onClick={() => updateMutation.mutate(editValues)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        ) : (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              title="Ligar"
                              onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'start' })}
                              disabled={actionMutation.isPending}
                            >
                              <Power className="h-4 w-4 text-lime-600" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              title="Desligar"
                              onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'stop' })}
                              disabled={actionMutation.isPending}
                            >
                              <PowerOff className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              title="Reiniciar"
                              onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'restart' })}
                              disabled={actionMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleSSHClick(vps)} title="Configurar SSH">
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(vps)}>
                              Editar
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal de Sincronização */}
        <Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
          <DialogContent className="max-w-4xl rounded-3xl border-none">
            <DialogHeader>
              <DialogTitle>Sincronizar com Contabo</DialogTitle>
              <CardDescription>
                Listagem de servidores encontrados na sua conta Contabo.
              </CardDescription>
            </DialogHeader>
            
            <div className="max-h-[60vh] overflow-y-auto mt-4 border border-border rounded-2xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>External ID</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSyncing ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
                    </TableRow>
                  ) : externalInstances?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">Nenhum servidor encontrado.</TableCell>
                    </TableRow>
                  ) : externalInstances?.map((instance: any) => {
                    const isAlreadyLinked = instances?.some((i: any) => i.external_id === String(instance.instanceId));
                    return (
                      <TableRow key={instance.instanceId}>
                        <TableCell className="font-medium">{instance.displayName}</TableCell>
                        <TableCell><code>{instance.instanceId}</code></TableCell>
                        <TableCell>{instance.ipAddress || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{instance.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isAlreadyLinked ? (
                            <Badge variant="secondary" className="text-[10px]">JÁ VINCULADO</Badge>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="rounded-xl"
                              onClick={() => handleAssignClick(instance)}
                            >
                              <UserPlus className="mr-2 size-3" /> Vincular
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Vinculação */}
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          <DialogContent className="max-w-md rounded-3xl border-none">
            <DialogHeader>
              <DialogTitle>Vincular Servidor a Cliente</DialogTitle>
              <CardDescription>
                Selecione o cliente e o serviço correspondente para vincular a instância <strong>{selectedExternalInstance?.displayName}</strong>.
              </CardDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Selecionar Cliente</Label>
                <Select onValueChange={setSelectedClientId} value={selectedClientId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Escolha um cliente..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {clients?.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClientId && (
                <div className="space-y-2">
                  <Label>Selecionar Serviço Ativo</Label>
                  <Select onValueChange={setSelectedServiceId} value={selectedServiceId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Escolha o serviço..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {clientServices?.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-xs text-muted-foreground mb-2">Nenhum serviço VPS encontrado para este cliente.</p>
                          <Button 
                            variant="link" 
                            size="sm" 
                            asChild
                            className="text-brand h-auto p-0"
                          >
                            <a href="/admin/clients" target="_blank">Criar pedido manual para o cliente</a>
                          </Button>
                        </div>
                      ) : clientServices?.map((service: any) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.products?.name} - {service.domain} ({service.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => assignMutation.mutate({
                  serviceId: selectedServiceId,
                  externalId: String(selectedExternalInstance?.instanceId),
                  ipAddress: selectedExternalInstance?.ipAddress,
                  name: selectedExternalInstance?.displayName
                })}
                disabled={!selectedServiceId || assignMutation.isPending}
                className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
              >
                Confirmar Vinculação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Modal SSH */}
        <Dialog open={!!showSSHModal} onOpenChange={(open) => !open && setShowSSHModal(null)}>
          <DialogContent className="max-w-md rounded-3xl border-none">
            <DialogHeader>
              <DialogTitle>Configurar Acesso SSH</DialogTitle>
              <CardDescription>Defina as credenciais para o cliente acessar a VPS.</CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label>Host / IP</Label>
                <Input value={sshValues.ssh_host} onChange={e => setSSHValues({...sshValues, ssh_host: e.target.value})} className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Porta</Label>
                  <Input type="number" value={sshValues.ssh_port} onChange={e => setSSHValues({...sshValues, ssh_port: parseInt(e.target.value)})} className="rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label>Usuário</Label>
                  <Input value={sshValues.ssh_user} onChange={e => setSSHValues({...sshValues, ssh_user: e.target.value})} className="rounded-xl" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Senha SSH</Label>
                <Input value={sshValues.ssh_password} onChange={e => setSSHValues({...sshValues, ssh_password: e.target.value})} className="rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => sshMutation.mutate(sshValues)} disabled={sshMutation.isPending} className="w-full rounded-xl bg-brand text-brand-foreground">
                Salvar Credenciais
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
