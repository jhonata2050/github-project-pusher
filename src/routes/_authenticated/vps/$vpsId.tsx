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
  Calendar,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { isVPSOnline, getVPSStatusLabel } from '@/lib/vps-status';
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
  // Considera dados do agente válidos se reportados recentemente (ou se existentes como histórico recente)
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

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string, label: string = 'Copiado!') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copiado para a área de transferência!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const ipAddress = vps.ip_address || details.ipConfig?.v4?.ip || details.ipAddress;
  const sshHost = vps.ssh_host || ipAddress || '127.0.0.1';
  const sshPort = vps.ssh_port || 22;
  const sshUser = vps.ssh_user || 'root';
  const sshPass = vps.ssh_password || '';
  const installCommand = `curl -sSL ${window.location.origin}/api/public/scripts/install-agent | bash -s -- ${vps.id}`;
  const sshCommand = `ssh ${sshUser}@${sshHost} -p ${sshPort}`;

  return (
    <AppShell breadcrumb="EQSAM CLOUD">
      <div className="space-y-4 max-w-6xl mx-auto pb-8">
        {/* Header Compacto */}
        <div className="flex items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="rounded-full h-8 w-8">
              <Link to="/vps">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{vps.name || details.displayName || vps.ip_address || 'Servidor VPS'}</h1>
                <Badge variant={isVPSOnline(details.status ?? vps.status) ? 'default' : 'secondary'} className="text-[11px] px-2.5 py-0.5 rounded-full">
                  {getVPSStatusLabel(details.status ?? vps.status)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {ipAddress && <span>IP: <strong className="font-mono text-foreground">{ipAddress}</strong></span>}
                {(vps.region || details.regionName) && <span>• {vps.region || details.regionName}</span>}
                <span>• {details.productName || 'Cloud VPS'}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl h-8 text-xs">
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isLoading && "animate-spin")} /> 
            Sincronizar
          </Button>
        </div>

        {/* Especificações Contratadas (Compactas) */}
        <div className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">Especificações</h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Card className="rounded-2xl border shadow-sm hover:border-primary/40 transition-colors">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">CPU</span>
                  <div className="text-lg font-bold mt-0.5">{details.specs?.cpu_cores || details.cpuCores || vps.cpu_cores || 'N/A'} <span className="text-xs font-normal text-muted-foreground">vCPU</span></div>
                </div>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600"><Cpu className="h-4 w-4" /></div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm hover:border-primary/40 transition-colors">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">RAM</span>
                  <div className="text-lg font-bold mt-0.5">{details.specs?.ram_gb || (details.ramMb ? Math.round(details.ramMb / 1024) : null) || vps.ram_gb || 'N/A'} <span className="text-xs font-normal text-muted-foreground">GB</span></div>
                </div>
                <div className="p-2 rounded-xl bg-lime-500/10 text-lime-600"><Activity className="h-4 w-4" /></div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm hover:border-primary/40 transition-colors">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Disco</span>
                  <div className="text-lg font-bold mt-0.5">{details.specs?.disk_gb || (details.diskMb ? Math.round(details.diskMb / 1024) : null) || displayStats.diskTotalGb || vps.disk_gb || 'N/A'} <span className="text-xs font-normal text-muted-foreground">GB</span></div>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600"><HardDrive className="h-4 w-4" /></div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm hover:border-primary/40 transition-colors">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sistema</span>
                  <div className="text-sm font-bold mt-0.5 truncate">{details.osType || details.osTemplate || vps.os_template || 'Linux'}</div>
                </div>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 shrink-0"><Monitor className="h-4 w-4" /></div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Métricas em tempo real (Compactas) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Monitoramento em Tempo Real</h2>
            {displayStats.lastUpdate && (
              <span className="text-[10px] text-muted-foreground">
                Atualizado: {format(new Date(displayStats.lastUpdate), "dd/MM HH:mm:ss", { locale: ptBR })}
              </span>
            )}
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
                  <span>Uso CPU</span>
                  <Cpu className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="text-lg font-bold mt-1">{displayStats.cpu?.usage !== null && displayStats.cpu?.usage !== undefined ? `${displayStats.cpu.usage}%` : 'N/A%'}</div>
                <Progress value={displayStats.cpu?.usage || 0} className="h-1.5 mt-2" />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
                  <span>Uso RAM</span>
                  <Activity className="h-3.5 w-3.5 text-lime-500" />
                </div>
                <div className="text-lg font-bold mt-1">{displayStats.ram?.usage !== null && displayStats.ram?.usage !== undefined ? `${displayStats.ram.usage}%` : 'N/A%'}</div>
                <Progress value={displayStats.ram?.usage || 0} className="h-1.5 mt-2" />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
                  <span>Uso Disco</span>
                  <HardDrive className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="text-lg font-bold mt-1">{displayStats.disk?.usage !== null && displayStats.disk?.usage !== undefined ? `${displayStats.disk.usage}%` : 'N/A%'}</div>
                <Progress value={displayStats.disk?.usage || 0} className="h-1.5 mt-2" />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
                  <span>IOPS</span>
                  <Database className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <div className="text-lg font-bold mt-1">
                  {displayStats.iops?.total ?? 'N/A'}
                  {displayStats.iops && <span className="text-xs font-normal text-muted-foreground"> /s</span>}
                </div>
                <span className="text-[10px] text-muted-foreground block truncate mt-1.5">
                  {displayStats.iops ? `R: ${displayStats.iops.read} | W: ${displayStats.iops.write}` : 'Requer agente'}
                </span>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
                  <span>Rede</span>
                  <Network className="h-3.5 w-3.5 text-teal-500" />
                </div>
                <div className="text-lg font-bold mt-1">
                  {displayStats.network ? `${Number(displayStats.network.inbound ?? 0).toFixed(1)} MB/s` : 'N/A'}
                </div>
                <span className="text-[10px] text-muted-foreground block truncate mt-1.5">
                  {displayStats.network ? `↓ ${Number(displayStats.network.inbound ?? 0).toFixed(1)} MB/s` : 'Requer agente'}
                </span>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SSH & Histórico Gráfico */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* SSH Card com Copiar em 1 Clique */}
          <Card className="rounded-2xl border shadow-sm overflow-hidden flex flex-col justify-between">
            <CardHeader className="bg-muted/40 p-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Terminal className="h-4 w-4 text-primary" /> Acesso SSH
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleCopy(sshCommand, 'ssh-cmd', 'Comando SSH')} 
                  className="h-7 text-xs rounded-lg gap-1.5"
                >
                  {copiedKey === 'ssh-cmd' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  Copiar comando
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-muted/30 p-2.5 rounded-xl border flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">Host / IP</span>
                    <span className="font-mono text-xs font-semibold truncate block">{sshHost}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleCopy(sshHost, 'host', 'Host IP')}>
                    {copiedKey === 'host' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                  </Button>
                </div>

                <div className="bg-muted/30 p-2.5 rounded-xl border flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">Porta</span>
                    <span className="font-mono text-xs font-semibold block">{sshPort}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleCopy(String(sshPort), 'port', 'Porta')}>
                    {copiedKey === 'port' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                  </Button>
                </div>

                <div className="bg-muted/30 p-2.5 rounded-xl border flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">Usuário</span>
                    <span className="font-mono text-xs font-semibold block">{sshUser}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleCopy(sshUser, 'user', 'Usuário')}>
                    {copiedKey === 'user' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                  </Button>
                </div>

                <div className="bg-muted/30 p-2.5 rounded-xl border flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">Senha</span>
                    <span className="font-mono text-xs font-semibold truncate block">
                      {showPassword ? (sshPass || 'Definida na criação') : '••••••••••••'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
                    </Button>
                    {sshPass && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(sshPass, 'pass', 'Senha')}>
                        {copiedKey === 'pass' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl font-mono text-[11px] text-slate-300 flex items-center justify-between border border-slate-800">
                <code className="truncate pr-2">{sshCommand}</code>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => handleCopy(sshCommand, 'ssh-box', 'Comando SSH')}>
                  {copiedKey === 'ssh-box' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Histórico Gráfico Compacto */}
          <Card className="rounded-2xl border shadow-sm flex flex-col justify-between">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="h-4 w-4 text-primary" /> Histórico de Uso
                </CardTitle>
              </div>
              <div className="flex bg-muted p-0.5 rounded-lg">
                {(['24h', '7d', '30d'] as const).map(p => (
                  <button 
                    key={p} 
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "px-2.5 py-0.5 text-[10px] font-bold rounded-md transition-all",
                      period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-36 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                      />
                      <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
                      <Area type="monotone" dataKey="ram" name="RAM %" stroke="#84cc16" fill="transparent" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs space-y-1.5">
                    <Activity className="h-6 w-6 opacity-25" />
                    <p className="text-[11px]">Sem dados históricos no período selecionado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agente de Monitoramento & Controles de Energia (Compactos) */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Card do Agente com Botão de Copiar */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Instalação do Agente de Monitoramento</span>
                <Badge variant="outline" className="text-[10px] font-normal">Automático</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Coleta métricas em tempo real (CPU, RAM, Disco, IOPS e Rede).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
              <div className="bg-slate-950 p-2.5 rounded-xl font-mono text-[10px] text-slate-300 border border-slate-800 flex items-center justify-between gap-2">
                <code className="truncate flex-1 select-all">{installCommand}</code>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCopy(installCommand, 'agent-cmd', 'Script do Agente')}
                  className="h-6 text-[10px] px-2 rounded-md shrink-0 text-slate-300 hover:text-white hover:bg-slate-800 gap-1"
                >
                  {copiedKey === 'agent-cmd' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Controles de Energia Compactos */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">Gerenciamento de Energia</CardTitle>
              <CardDescription className="text-xs">Controle o estado de execução da instância VPS</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 h-10 rounded-xl gap-1.5 border-lime-200 hover:bg-lime-50 text-xs font-semibold"
                onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'start' })}
              >
                <Power className="h-4 w-4 text-lime-600" /> Ligar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 h-10 rounded-xl gap-1.5 border-blue-200 hover:bg-blue-50 text-xs font-semibold"
                onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'restart' })}
              >
                <RotateCcw className="h-4 w-4 text-blue-600" /> Reiniciar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 h-10 rounded-xl gap-1.5 border-red-200 hover:bg-red-50 text-xs font-semibold"
                onClick={() => actionMutation.mutate({ instanceId: vps.id, action: 'stop' })}
              >
                <ShieldAlert className="h-4 w-4 text-red-600" /> Parar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
