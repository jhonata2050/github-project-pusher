import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyVPSInstances, contaboAction } from '@/lib/vps.functions';
import { AppShell } from '@/components/app/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Power, RotateCcw, Monitor, ShieldAlert, CheckCircle2, Clock, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/vps/')({
  component: VPSManagementPage,
});

function VPSManagementPage() {
  const { data: instances, isLoading } = useQuery({
    queryKey: ['vps-instances'],
    queryFn: () => getMyVPSInstances(),
  });

  const queryClient = useQueryClient();

  const actionMutation = useMutation({
    mutationFn: (vars: { instanceId: string; action: 'start' | 'stop' | 'restart' | 'reinstall' }) => 
      contaboAction({ data: vars }),
    onSuccess: (_, vars) => {
      toast.success(`Comando ${vars.action} enviado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['vps-instances'] });
    },
    onError: (err: any) => {
      toast.error(`Falha ao executar comando: ${err.message}`);
    }
  });

  return (
    <AppShell breadcrumb="VPS">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servidores VPS</h1>
          <p className="text-muted-foreground">
            Gerencie suas instâncias VPS em tempo real.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="rounded-3xl border-none shadow-sm h-64">
                <CardContent className="p-6">
                  <Skeleton className="h-full w-full rounded-2xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : instances?.length === 0 ? (
          <Card className="rounded-3xl border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle>Nenhuma instância encontrada</CardTitle>
              <CardDescription>
                Você ainda não possui servidores VPS ativos em sua conta.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {instances?.map((vps: any) => (
              <Card key={vps.id} className="rounded-3xl overflow-hidden border-2 hover:border-primary transition-all">
                <CardHeader className="bg-muted/50 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        vps.status === 'active' ? "bg-lime-500" : "bg-orange-500"
                      )} />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        CLOUD SERVER
                      </span>
                    </div>
                    {vps.status === 'active' ? (
                      <CheckCircle2 className="h-4 w-4 text-lime-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                  <CardTitle className="text-xl font-bold">{vps.ip_address || 'VPS em Operação'}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    ID: {vps.external_id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Região</p>
                      <p className="font-bold text-base">{vps.region || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Sistema</p>
                      <p className="font-bold text-base truncate">{vps.os_template || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs mb-6 border-t pt-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">CPU</span>
                      <span className="font-semibold">{vps.last_metrics?.cpu || vps.cpu_cores || '2'} vCPU</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">RAM</span>
                      <span className="font-semibold">{vps.last_metrics?.ram || vps.ram_gb || '4'} GB</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Disco</span>
                      <span className="font-semibold">{vps.last_metrics?.disk || vps.disk_gb || '50'} GB</span>
                    </div>
                  </div>
                  
                  <Button asChild className="w-full rounded-xl gap-2 font-bold bg-[#B4F461] hover:bg-[#A3E350] text-black border-none">
                    <Link to="/vps/$vpsId" params={{ vpsId: vps.id }}>
                      Ver Detalhes <Activity className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
