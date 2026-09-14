import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  getVPSAdminData, 
  updateVPSInstance, 
  syncContaboInstancesFn, 
  assignInstanceToClient,
  updateVPSSSHDetails,
  performAdminVPSAction,
} from '@/lib/vps-admin.functions';
import { AppShell } from '@/components/app/AppShell';
import { toast } from 'sonner';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  AdminVPSHeader,
  VPSInstancesTable,
  SyncContaboModal,
  AssignInstanceModal,
  SSHConfigModal,
  type AdminVPSInstance,
  type EditInstanceValues,
  type SSHConfigValues,
  type ExternalContaboInstance,
} from '@/components/admin/vps/instances';

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
  const [editValues, setEditValues] = useState<EditInstanceValues>({ id: '' });
  const [sshValues, setSSHValues] = useState<SSHConfigValues>({ id: '' });
  
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedExternalInstance, setSelectedExternalInstance] = useState<ExternalContaboInstance | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

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
      performAdminVPSAction({ data: vars }),
    onSuccess: (_, vars) => {
      toast.success(`Ação ${vars.action} enviada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['admin-vps-instances'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleEdit = (vps: AdminVPSInstance) => {
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

  const handleAssignClick = (instance: ExternalContaboInstance) => {
    setSelectedExternalInstance(instance);
    setIsAssignModalOpen(true);
  };

  const handleSSHClick = (vps: AdminVPSInstance) => {
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
        <AdminVPSHeader
          isSyncing={isSyncing}
          onSyncClick={handleSyncClick}
        />

        <VPSInstancesTable
          instances={instances as AdminVPSInstance[]}
          editingId={editingId}
          editValues={editValues}
          isActionPending={actionMutation.isPending}
          onEditChange={setEditValues}
          onStartEdit={handleEdit}
          onSaveEdit={(values) => updateMutation.mutate(values)}
          onAction={(instanceId, action) => actionMutation.mutate({ instanceId, action })}
          onConfigureSSH={handleSSHClick}
        />

        <SyncContaboModal
          isOpen={isSyncModalOpen}
          isSyncing={isSyncing}
          externalInstances={externalInstances as ExternalContaboInstance[] | undefined}
          instances={instances as AdminVPSInstance[]}
          onOpenChange={setIsSyncModalOpen}
          onAssignClick={handleAssignClick}
        />

        <AssignInstanceModal
          isOpen={isAssignModalOpen}
          selectedInstance={selectedExternalInstance}
          clients={clients}
          clientServices={clientServices}
          selectedClientId={selectedClientId}
          selectedServiceId={selectedServiceId}
          isAssignPending={assignMutation.isPending}
          onOpenChange={setIsAssignModalOpen}
          onClientChange={setSelectedClientId}
          onServiceChange={setSelectedServiceId}
          onConfirmAssign={() => assignMutation.mutate({
            serviceId: selectedServiceId,
            externalId: String(selectedExternalInstance?.instanceId),
            ipAddress: selectedExternalInstance?.ipAddress,
            name: selectedExternalInstance?.displayName || selectedExternalInstance?.name
          })}
        />

        <SSHConfigModal
          isOpen={!!showSSHModal}
          sshValues={sshValues}
          isSaving={sshMutation.isPending}
          onOpenChange={(open) => !open && setShowSSHModal(null)}
          onChange={setSSHValues}
          onSave={() => sshMutation.mutate(sshValues)}
        />
      </div>
    </AppShell>
  );
}
