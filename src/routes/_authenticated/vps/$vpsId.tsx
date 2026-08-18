import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVPSDetails, contaboAction } from '@/lib/vps.functions';
import { AppShell } from '@/components/app/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Power, 
  RotateCcw, 
  ShieldAlert, 
  ArrowLeft, 
  Activity, 
  Cpu, 
  HardDrive, 
  Network, 
  Database,
  RefreshCw,
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/vps/$vpsId')({
  component: VPSDetailsPage,
});

function VPSDetailsPage() {
  const { vpsId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: vps, isLoading, error, refetch } = useQuery({
    queryKey: ['vps-details', vpsId],
    queryFn: () => getVPSDetails({ data: { instanceId: vpsId } }),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
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
      <AppShell breadcrumb="Detalhes da VPS">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !vps) {
    return (
      <AppShell breadcrumb="Erro">
        <div className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-bold">Erro ao carregar VPS</h2>
          <p className="text-muted-foreground mb-6">Não foi possível encontrar as informações desta instância.</p>
          <Button asChild>
            <Link to="/vps">Voltar para a lista</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const stats = vps.stats || { cpu: null, ram: null, disk: null, network: null };
  const details = vps.externalDetails || {};

  return (
    <AppShell breadcrumb={vps.ip_address || 'Detalhes da VPS'}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full">
              <Link to="/vps">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{details.displayName || vps.ip_address || 'VPS em Operação'}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  vps.status === 'active' ? "bg-lime-500" : "bg-orange-500"
                )} />
                <span className="text-sm text-muted-foreground capitalize">
                  {vps.status} • {vps.provider_name} ({vps.external_id})
                </span>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              refetch();
              toast.info("Sincronizando dados com a Contabo...");
            }} 
            className="rounded-xl"
            disabled={isLoading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> 
            {isLoading ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* CPU Usage */}
          <Card className="rounded-3xl border-2 border-muted hover:border-primary/20 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-500" /> Uso de CPU
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold">
                  {stats.cpu?.usage !== null && stats.cpu?.usage !== undefined ? `${stats.cpu.usage}%` : 'N/A'}
                </span>
              </div>
              <Progress value={stats.cpu?.usage || 0} className="h-2" />
            </CardContent>
          </Card>

          {/* RAM Usage */}
          <Card className="rounded-3xl border-2 border-muted hover:border-primary/20 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-lime-500" /> Uso de Memória RAM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold">
                  {stats.ram?.usage !== null && stats.ram?.usage !== undefined ? `${stats.ram.usage}%` : 'N/A'}
                </span>
                <span className="text-xs text-muted-foreground">de {details.ramMb ? (details.ramMb / 1024).toFixed(0) : (vps.ram_gb || '8')} GB</span>
              </div>
              <Progress value={stats.ram?.usage || 0} className="h-2" />
            </CardContent>
          </Card>

          {/* Disk Usage */}
          <Card className="rounded-3xl border-2 border-muted hover:border-primary/20 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-orange-500" /> Uso de Disco (HD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold">
                  {stats.disk?.usage !== null && stats.disk?.usage !== undefined ? `${stats.disk.usage}%` : 'N/A'}
                </span>
              </div>
              <Progress value={stats.disk?.usage || 0} className="h-2" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Ações e Status */}
          <Card className="rounded-3xl border-2">
            <CardHeader>
              <CardTitle>Controle da Instância</CardTitle>
              <CardDescription>Gerencie o estado de energia da sua VPS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="flex flex-col h-24 rounded-2xl gap-2 hover:bg-lime-50 hover:text-lime-700 hover:border-lime-200"
                  onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'start' })}
                  disabled={actionMutation.isPending}
                >
                  <Power className="h-6 w-6 text-lime-600" />
                  Ligar
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-24 rounded-2xl gap-2 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                  onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'stop' })}
                  disabled={actionMutation.isPending}
                >
                  <ShieldAlert className="h-6 w-6 text-red-600" />
                  Parar
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-24 rounded-2xl gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                  onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'restart' })}
                  disabled={actionMutation.isPending}
                >
                  <RotateCcw className="h-6 w-6 text-blue-600" />
                  Reiniciar
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground hover:text-red-500 rounded-xl"
                  onClick={() => {
                    if (confirm("ATENÇÃO: Isso apagará TODOS os dados do servidor. Deseja continuar?")) {
                      actionMutation.mutate({ instanceId: vps.id, action: 'reinstall' });
                    }
                  }}
                >
                  Reinstalar Sistema Operacional
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Informações Técnicas */}
          <Card className="rounded-3xl border-2">
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Monitor className="h-4 w-4" /> Endereço IP
                  </span>
                  <span className="font-mono font-medium">{vps.ip_address || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Sistema Operacional</span>
                  <span className="font-medium">{details.osName || vps.os_template || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Região / Datacenter</span>
                  <span className="font-medium">{details.region || vps.region || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Network className="h-4 w-4" /> Tráfego de Rede
                  </span>
                  <span className="font-medium text-xs">
                    {stats.network?.outbound !== null ? `↑ ${stats.network.outbound} Mbps / ↓ ${stats.network.inbound} Mbps` : 'Dados indisponíveis'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Database className="h-4 w-4" /> Plano Contratado
                  </span>
                  <span className="font-medium">{details.productName || vps.service?.product?.name || 'VPS'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
