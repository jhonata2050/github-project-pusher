import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getVPSDetails, contaboAction, getVPSMetricsHistory } from '@/lib/vps.functions';
import { AppShell } from '@/components/app/AppShell';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';
import { format } from 'date-fns';
import {
  VPSHeader,
  VPSSpecsCard,
  VPSLiveMetricsCard,
  VPSSshAccessCard,
  VPSMetricsChartCard,
  VPSAgentAndPowerCard,
  type VPSInstanceDetails,
} from '@/components/vps/details';

export const Route = createFileRoute('/_authenticated/vps/$vpsId')({
  component: VPSDetailsPage,
});

function VPSDetailsPage() {
  const { vpsId } = Route.useParams();
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [showPassword, setShowPassword] = useState(false);

  const { data: vps, isLoading, error, refetch } = useQuery({
    queryKey: ['vps-details', vpsId],
    queryFn: () => getVPSDetails({ data: { instanceId: vpsId } }),
    refetchInterval: 30000,
  });

  const { data: history } = useQuery({
    queryKey: ['vps-metrics-history', vpsId, period],
    queryFn: () => getVPSMetricsHistory({ data: { instanceId: vpsId, period } }),
  });

  const actionMutation = useMutation({
    mutationFn: (vars: { instanceId: string; action: 'start' | 'stop' | 'restart' | 'reinstall' }) => 
      contaboAction({ data: vars }),
    onSuccess: (_, vars) => {
      toast.success(`Comando ${vars.action} enviado com sucesso!`);
      refetch();
    },
    onError: (err: any) => {
      toast.error(`Falha ao executar comando: ${err.message}`);
    }
  });

  if (isLoading) {
    return (
      <AppShell breadcrumb="EQSAM CLOUD">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !vps) return <AppShell breadcrumb="Erro">EQSAM CLOUD não encontrado.</AppShell>;

  const details = vps.externalDetails || {};
  const stats = vps.stats || { cpu: null, ram: null, disk: null, network: null, agentRequired: false };
  const agentMetrics = vps.last_metrics;
  const isAgentDataFresh = Boolean(agentMetrics && agentMetrics.last_update);
  
  const displayStats = (isAgentDataFresh ? {
    cpu: { usage: agentMetrics.cpu ?? stats.cpu?.usage },
    ram: { usage: agentMetrics.ram ?? stats.ram?.usage },
    disk: { usage: agentMetrics.disk ?? stats.disk?.usage },
    iops: agentMetrics.iops ?? null,
    network: agentMetrics.network ?? stats.network,
    diskUsedGb: agentMetrics.disk_used_gb ?? null,
    diskTotalGb: agentMetrics.disk_total_gb ?? null,
    lastUpdate: agentMetrics.last_update,
    isAgent: true
  } : {
    ...stats,
    network: stats.network ?? null,
  }) as any;

  const chartData = (history || []).map((h: any) => ({
    time: format(new Date(h.created_at), period === '24h' ? 'HH:mm' : 'dd/MM HH:mm'),
    cpu: h.cpu,
    ram: h.ram,
    disk: h.disk
  }));

  const ipAddress = vps.ip_address || details.ipConfig?.v4?.ip || details.ipAddress;
  const installCommand = `curl -sSL ${window.location.origin}/api/public/scripts/install-agent | bash -s -- ${vps.id}`;

  return (
    <AppShell breadcrumb="EQSAM CLOUD">
      <div className="space-y-6">
        <VPSHeader
          vps={vps as VPSInstanceDetails}
          details={details}
          ipAddress={ipAddress}
          isLoading={isLoading}
          onRefresh={() => refetch()}
        />

        <VPSSpecsCard
          vps={vps as VPSInstanceDetails}
          details={details}
          displayStats={displayStats}
        />

        <VPSLiveMetricsCard
          vps={vps as VPSInstanceDetails}
          displayStats={displayStats}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <VPSSshAccessCard
            vps={vps as VPSInstanceDetails}
            ipAddress={ipAddress}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />

          <VPSMetricsChartCard
            period={period}
            setPeriod={setPeriod}
            chartData={chartData}
          />
        </div>

        <VPSAgentAndPowerCard
          installCommand={installCommand}
          isActionPending={actionMutation.isPending}
          onAction={(action) => actionMutation.mutate({ instanceId: vps.id, action })}
        />
      </div>
    </AppShell>
  );
}
