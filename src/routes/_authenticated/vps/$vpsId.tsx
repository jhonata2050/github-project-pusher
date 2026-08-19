import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVPSDetails, contaboAction, getVPSMetricsHistory } from '@/lib/vps.functions';
import { AppShell } from '@/components/app/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
  Monitor,
  Eye,
  EyeOff,
  Terminal,
  Lock,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Route = createFileRoute('/_authenticated/vps/$vpsId')({
  component: VPSDetailsPage,
});

function VPSDetailsPage() {
  const { vpsId } = Route.useParams();
  const queryClient = useQueryClient();
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
  const isAgentDataFresh = agentMetrics?.last_update && (new Date().getTime() - new Date(agentMetrics.last_update).getTime() < 5 * 60 * 1000);
  
  const displayStats = isAgentDataFresh ? {
    cpu: { usage: agentMetrics.cpu },
    ram: { usage: agentMetrics.ram },
    disk: { usage: agentMetrics.disk },
    network: stats.network,
    lastUpdate: agentMetrics.last_update,
    isAgent: true
  } : stats;

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full">
              <Link to="/vps">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{details.displayName || ipAddress}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={vps.status === 'active' ? 'default' : 'secondary'} className="rounded-full">
                  {vps.status === 'active' ? 'VPS em Operação' : 'Offline'}
                </Badge>
                <span className="text-sm text-muted-foreground italic">IP: {ipAddress}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="rounded-xl">
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> 
            Sincronizar
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="rounded-3xl border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Cpu className="h-4 w-4 text-blue-500" /> CPU</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayStats.cpu?.usage ?? 'N/A'}%</div>
              <Progress value={displayStats.cpu?.usage || 0} className="h-2 mt-2" />
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4 text-lime-500" /> RAM</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayStats.ram?.usage ?? 'N/A'}%</div>
              <Progress value={displayStats.ram?.usage || 0} className="h-2 mt-2" />
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><HardDrive className="h-4 w-4 text-orange-500" /> DISCO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayStats.disk?.usage ?? 'N/A'}%</div>
              <Progress value={displayStats.disk?.usage || 0} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* SSH Card */}
          <Card className="rounded-3xl border-2 bg-[#020617] text-slate-100 overflow-hidden">
            <CardHeader className="bg-[#0f172a]/40 border-b border-slate-800/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Terminal className="h-5 w-5 text-lime-400" /> Acesso SSH
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Dados para conexão via terminal (SSH)</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block opacity-70">Host / IP</span>
                  <div className="font-mono text-sm bg-[#0f172a]/80 p-3 rounded-xl border border-slate-800/50 text-slate-200">
                    {vps.ssh_host || ipAddress || 'N/A'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block opacity-70">Porta</span>
                  <div className="font-mono text-sm bg-[#0f172a]/80 p-3 rounded-xl border border-slate-800/50 text-slate-200">
                    {vps.ssh_port || 22}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block opacity-70">Usuário</span>
                  <div className="font-mono text-sm bg-[#0f172a]/80 p-3 rounded-xl border border-slate-800/50 text-slate-200">
                    {vps.ssh_user || 'root'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block opacity-70">Senha</span>
                  <div className="font-mono text-sm bg-[#0f172a]/80 p-3 rounded-xl border border-slate-800/50 text-slate-200 flex items-center justify-between">
                    <span className="truncate">{showPassword ? (vps.ssh_password || '********') : '••••••••'}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-slate-800 text-slate-400 hover:text-slate-100" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/50 mt-2">
                <code className="text-[10px] text-slate-500 font-mono">ssh {vps.ssh_user || 'root'}@{vps.ssh_host || ipAddress} -p {vps.ssh_port || 22}</code>
              </div>
            </CardContent>
          </Card>

          {/* Histórico Gráfico */}
          <Card className="rounded-3xl border-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Histórico</CardTitle>
                <CardDescription className="text-xs">Métricas coletadas pelo agente</CardDescription>
              </div>
              <div className="flex bg-muted p-1 rounded-xl">
                {(['24h', '7d', '30d'] as const).map(p => (
                  <button 
                    key={p} 
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                      period === p ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-48 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
                      <Area type="monotone" dataKey="ram" name="RAM %" stroke="#84cc16" fill="transparent" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs space-y-2">
                    <Activity className="h-8 w-8 opacity-20" />
                    <p>Sem dados históricos para este período</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agente e Controles */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-3xl border-2">
            <CardHeader><CardTitle>EQSAM CLOUD: Agente</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">Instale o agente para obter métricas em tempo real e histórico de uso.</p>
              <div className="bg-slate-950 p-4 rounded-xl font-mono text-[10px] text-slate-300 border border-slate-800 overflow-x-auto">
                <code>{installCommand}</code>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2">
            <CardHeader><CardTitle>Estado de Energia</CardTitle></CardHeader>
            <CardContent className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 h-20 rounded-2xl flex-col gap-2 border-lime-200 hover:bg-lime-50"
                onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'start' })}
              >
                <Power className="h-5 w-5 text-lime-600" /> Ligar
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 h-20 rounded-2xl flex-col gap-2 border-blue-200 hover:bg-blue-50"
                onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'restart' })}
              >
                <RotateCcw className="h-5 w-5 text-blue-600" /> Reiniciar
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 h-20 rounded-2xl flex-col gap-2 border-red-200 hover:bg-red-50"
                onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'stop' })}
              >
                <ShieldAlert className="h-5 w-5 text-red-600" /> Parar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
