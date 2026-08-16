import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyVPSInstances, contaboAction } from '@/lib/vps.functions';
import { AppShell } from '@/components/app/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Power, RotateCcw, Monitor, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/vps/')({
  component: VPSManagementPage,
});

function VPSManagementPage() {
  const { data: instances } = useSuspenseQuery({
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
            Gerencie suas instâncias VPS Contabo em tempo real.
          </p>
        </div>

        {instances?.length === 0 ? (
          <Card className="rounded-3xl border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle>Nenhuma VPS encontrada</CardTitle>
              <CardDescription>
                Você ainda não possui servidores VPS ativos em sua conta.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {instances?.map((vps: any) => (
              <Card key={vps.id} className="rounded-3xl overflow-hidden border-2 hover:border-lime-500 transition-all">
                <CardHeader className="bg-muted/50 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-lime-500" />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {vps.vps_type || 'VPS Contabo'}
                      </span>
                    </div>
                    {vps.status === 'active' ? (
                      <CheckCircle2 className="h-4 w-4 text-lime-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                  <CardTitle className="text-xl font-bold">{vps.ip_address || 'Provisionando...'}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    ID: {vps.external_id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Região</p>
                      <p className="font-semibold">{vps.region || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sistema</p>
                      <p className="font-semibold">{vps.os_template || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="pt-4 grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl flex-1"
                      onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'start' })}
                      disabled={actionMutation.isPending}
                    >
                      <Power className="mr-2 h-3 w-3 text-lime-600" /> Ligar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl flex-1"
                      onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'stop' })}
                      disabled={actionMutation.isPending}
                    >
                      <ShieldAlert className="mr-2 h-3 w-3 text-red-500" /> Parar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl flex-1"
                      onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'restart' })}
                      disabled={actionMutation.isPending}
                    >
                      <RotateCcw className="mr-2 h-3 w-3 text-blue-500" /> Reset
                    </Button>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full text-xs text-muted-foreground hover:text-red-500"
                    onClick={() => {
                      if (confirm("Tem certeza que deseja reinstalar? Todos os dados serão perdidos.")) {
                        actionMutation.mutate({ instanceId: vps.id, action: 'reinstall' });
                      }
                    }}
                  >
                    Reinstalar Sistema Operacional
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
