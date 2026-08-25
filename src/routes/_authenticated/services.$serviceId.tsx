import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  LayoutPanelLeft, 
  Store, 
  ExternalLink, 
  ArrowLeft, 
  HardDrive, 
  Mail, 
  Globe, 
  Database, 
  Activity,
  User,
  ShieldCheck,
  Zap,
  ShieldAlert,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Calendar,
  Check
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { getServiceServerDetails, getDASSOUrl } from "@/lib/support.functions";
import { getAvailableUpgrades, requestServiceUpgrade } from "@/lib/upgrade.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isVPSService, getVPSInstance } from "@/lib/service-type";

export const Route = createFileRoute("/_authenticated/services/$serviceId")({
  head: () => ({
    meta: [
      { title: "Gerenciar Serviço — Eqsam" },
    ],
  }),
  component: ServiceManagementPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function ServiceManagementPage() {
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedUpgradeProduct, setSelectedUpgradeProduct] = useState<string | null>(null);

  const { data: service, isLoading, error } = useQuery({
    queryKey: ["service-details", serviceId],
    queryFn: async () => {
      return getServiceServerDetails({ data: serviceId });
    },
  });

  const { data: upgradeData, isLoading: isLoadingUpgrades } = useQuery({
    queryKey: ["service-upgrades", serviceId],
    queryFn: () => getAvailableUpgrades({ data: { serviceId } }),
    enabled: upgradeDialogOpen,
  });

  const upgradeMutation = useMutation({
    mutationFn: (targetProductId: string) => requestServiceUpgrade({ data: { serviceId, targetProductId } }),
    onSuccess: (res) => {
      toast.success(`Fatura de upgrade para ${res.targetProductName} gerada com sucesso!`);
      setUpgradeDialogOpen(false);
      navigate({ to: "/invoices/$invoiceId", params: { invoiceId: res.invoiceId } });
    },
    onError: (err: any) => {
      toast.error(`Falha ao solicitar upgrade: ${err.message}`);
    }
  });

  const handleSSO = async (command?: string) => {
    if (service && (service as any).block_directadmin) {
      toast.error("Seu acesso ao painel de controle foi temporariamente bloqueado para este serviço. Por favor, entre em contato com o suporte.");
      return;
    }

    // @ts-ignore
    const ssoSupported = service?.servers?.sso_supported;
    
    if (ssoSupported === false) {
      toast.error(
        "O provedor DirectAdmin deste servidor não permite SSO delegado. Por favor, utilize suas credenciais manuais para acessar o painel.",
        { duration: 6000 }
      );
      return;
    }

    // @ts-ignore
    if (!service?.server_id || !service?.username) {
      toast.error("O usuário ou servidor ainda não foi vinculado a este serviço. Verifique a importação.");
      return;
    }

    const promise = (async () => {
      const url = await getDASSOUrl({ 
        data: { 
          // @ts-ignore
          serverId: service.server_id, 
          // @ts-ignore
          username: service.username,
          redirectUrl: command || '/'
        } 
      });
      window.open(url, '_blank');
      return url;
    })();

    toast.promise(promise, {
      loading: 'Gerando acesso seguro ao painel...',
      success: 'Redirecionando para o DirectAdmin...',
      error: (err) => {
        const errorMsg = err.message || '';
        if (errorMsg.includes("DA_AUTHENTICATION_ERROR")) return "Erro de autenticação com o servidor.";
        if (errorMsg.includes("DA_LOGIN_KEY_IP_NOT_ALLOWED")) return "IP não autorizado no servidor.";
        if (errorMsg.includes("DA_PERMISSION_ERROR")) return "A chave API não tem permissão para esta ação.";
        if (errorMsg.includes("DA_DIRECTADMIN_BLOCKED")) return "Acesso negado: Conta administrativa.";
        if (errorMsg.includes("DA_SERVICE_NOT_ACTIVE")) return "Serviço não está ativo.";
        if (errorMsg.includes("DA_INVALID_TARGET_USER")) return "Usuário não encontrado no servidor.";
        
        return `Erro ao acessar painel: ${err.message}`;
      }
    });
  };

  if (error) {
    return (
      <AppShell 
        area="client"
        breadcrumb={
          <>
            <Link to="/services" className="flex items-center gap-2 hover:text-foreground transition-colors">
              <LayoutPanelLeft className="size-4" />
              Meus serviços
            </Link>
            <span>/</span>
            <span className="font-medium text-foreground text-destructive">Erro</span>
          </>
        }
      >
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-destructive font-medium">Erro ao carregar serviço</p>
          <Button variant="link" asChild className="mt-2">
            <Link to="/services">Voltar para meus serviços</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      area="client"
      breadcrumb={
        <>
          <Link to="/services" className="flex items-center gap-2 hover:text-foreground transition-colors">
            <LayoutPanelLeft className="size-4" />
            Meus serviços
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">Gerenciar</span>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-xl">
              <Link to="/services">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {isVPSService(service) ? 'Gerenciar VPS' : 'Gerenciar Plano'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {service?.domain || (isLoading ? "Carregando..." : "Sem domínio")}
              </p>
            </div>
            {service?.status && (
              <Badge className={cn(
                "rounded-full px-4 py-1",
                service.block_directadmin ? 'bg-destructive text-destructive-foreground' : 
                service.status === 'active' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
              )}>
                {service.block_directadmin ? 'Bloqueado' : service.status === 'active' ? 'Ativo' : service.status}
              </Badge>
            )}
          </div>

          {/* Botão de Upgrade de Plano */}
          {service && service.status === 'active' && (
            <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm">
                  <Sparkles className="size-4" />
                  Fazer Upgrade de Plano
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl rounded-3xl p-6">
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <TrendingUp className="size-5 text-primary" /> Upgrade de Plano
                  </DialogTitle>
                  <DialogDescription>
                    Migre para um plano superior pagando apenas o valor proporcional (Prorata) dos dias restantes.
                  </DialogDescription>
                </DialogHeader>

                {isLoadingUpgrades ? (
                  <div className="py-8 space-y-4">
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                  </div>
                ) : upgradeData?.availableUpgrades && upgradeData.availableUpgrades.length > 0 ? (
                  <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-1">
                    <div className="p-3 bg-secondary/40 rounded-xl text-xs flex justify-between items-center text-muted-foreground">
                      <span>Plano Atual: <strong className="text-foreground">{upgradeData.service.currentProduct.name}</strong></span>
                      <span>Dias restantes no ciclo: <strong className="text-foreground">{upgradeData.service.daysRemaining} dias</strong></span>
                    </div>

                    <div className="space-y-3">
                      {upgradeData.availableUpgrades.map((pkg: any) => (
                        <div 
                          key={pkg.id}
                          onClick={() => setSelectedUpgradeProduct(pkg.id)}
                          className={cn(
                            "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
                            selectedUpgradeProduct === pkg.id 
                              ? "border-primary bg-primary/5 shadow-sm" 
                              : "border-border hover:border-primary/40 bg-card"
                          )}
                        >
                          <div>
                            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                              {pkg.name}
                              {selectedUpgradeProduct === pkg.id && (
                                <CheckCircle2 className="size-4 text-primary" />
                              )}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{pkg.description || "Recursos expandidos"}</p>
                            <div className="flex gap-2 mt-2">
                              {pkg.directadminPackage && (
                                <Badge variant="outline" className="text-[10px] rounded-md">
                                  Pacote: {pkg.directadminPackage}
                                </Badge>
                              )}
                              {pkg.cpuCores && (
                                <Badge variant="outline" className="text-[10px] rounded-md">
                                  {pkg.cpuCores} vCPU
                                </Badge>
                              )}
                              {pkg.ramGb && (
                                <Badge variant="outline" className="text-[10px] rounded-md">
                                  {pkg.ramGb} GB RAM
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="text-right sm:self-center shrink-0">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">Pagar agora (Prorata)</div>
                            <div className="text-lg font-bold text-primary">{brl.format(pkg.prorataAmount)}</div>
                            <div className="text-[10px] text-muted-foreground">Novo valor: {brl.format(pkg.targetPrice)}/mês</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 flex justify-end gap-2 border-t">
                      <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)} className="rounded-xl">
                        Cancelar
                      </Button>
                      <Button 
                        disabled={!selectedUpgradeProduct || upgradeMutation.isPending}
                        onClick={() => selectedUpgradeProduct && upgradeMutation.mutate(selectedUpgradeProduct)}
                        className="rounded-xl bg-primary text-primary-foreground gap-2"
                      >
                        {upgradeMutation.isPending ? "Gerando Fatura..." : "Confirmar Upgrade"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground space-y-3">
                    <CheckCircle2 className="size-10 text-lime-600 mx-auto opacity-70" />
                    <p className="text-sm font-medium">Você já está no melhor plano disponível!</p>
                    <p className="text-xs">Não há opções de upgrade superiores para este serviço no momento.</p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>

        {service && service.block_directadmin && (
          <Card className="rounded-3xl border-destructive/20 bg-destructive/5 border shadow-sm">
            <CardContent className="p-6 flex items-start gap-4">
              <ShieldAlert className="size-8 text-destructive shrink-0 mt-1" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-destructive">Acesso Bloqueado por Segurança</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Identificamos uma inconsistência ou conflito de domínio no servidor para este serviço. 
                  Para garantir sua segurança e a integridade dos dados, o acesso automático ao painel foi temporariamente suspenso.
                </p>
                <div className="pt-4">
                  <Button asChild variant="destructive" className="rounded-xl">
                    <Link to="/tickets">Abrir Chamado de Suporte</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            <Skeleton className="h-64 rounded-3xl md:col-span-2" />
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
          </div>
        ) : service && (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm bg-card overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-brand">
                    <Zap className="size-5 fill-brand" />
                    <CardTitle className="text-lg">Detalhes do Servidor</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-secondary/30">
                      <p className="text-xs text-muted-foreground font-medium uppercase">Usuário</p>
                      <p className="mt-1 font-bold text-foreground">
                        {service.username || '---'}
                        {!service.username && (
                          <span className="ml-2 text-[10px] text-destructive font-normal block italic">
                            (Pendente Sincronização)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-secondary/30">
                      <p className="text-xs text-muted-foreground font-medium uppercase">IP do Servidor</p>
                      <p className="mt-1 font-bold text-foreground">{service.servers?.ip_address || service.servers?.hostname || '---'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-secondary/30">
                      <p className="text-xs text-muted-foreground font-medium uppercase">Servidor</p>
                      <p className="mt-1 font-bold text-foreground">{service.servers?.name || '---'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button 
                      onClick={() => handleSSO()} 
                      className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 gap-2"
                    >
                      <ExternalLink className="size-4" />
                      Acessar Painel de Controle
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleSSO('CMD_FILE_MANAGER')} 
                      className="rounded-xl border-border hover:bg-secondary/50 gap-2"
                    >
                      <HardDrive className="size-4" />
                      Gerenciador de Arquivos
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Status Card */}
              <Card className="rounded-3xl border-none shadow-sm bg-card overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="size-5 text-muted-foreground" />
                    Status da Conta
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Próximo Vencimento</span>
                      <span className="text-sm font-semibold">
                        {service.next_due_date ? new Date(service.next_due_date).toLocaleDateString("pt-BR") : "---"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Ciclo de Faturamento</span>
                      <span className="text-sm font-semibold capitalize">{service.billing_cycle}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Data de Criação</span>
                      <span className="text-sm font-semibold">
                        {new Date(service.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {isVPSService(service) ? (
                <>
                  <QuickActionCard 
                    icon={<Activity className="size-6" />} 
                    title="Monitorar VPS" 
                    onClick={() => {
                      const vpsId = getVPSInstance(service)?.id;
                      if (vpsId) {
                         navigate({ to: "/vps/$vpsId", params: { vpsId } });
                      } else {
                        toast.error("Instância VPS não encontrada.");
                      }
                    }} 
                  />
                  <QuickActionCard 
                    icon={<Zap className="size-6" />} 
                    title="Recursos" 
                    onClick={() => {
                      const vpsId = getVPSInstance(service)?.id;
                      if (vpsId) {
                         navigate({ to: "/vps/$vpsId", params: { vpsId } });
                      } else {
                        toast.error("Instância VPS não encontrada.");
                      }
                    }} 
                  />
                </>
              ) : (
                <>
                  <QuickActionCard 
                    icon={<Mail className="size-6" />} 
                    title="E-mails" 
                    onClick={() => handleSSO('CMD_EMAIL_POP')} 
                  />
                  <QuickActionCard 
                    icon={<Database className="size-6" />} 
                    title="Bancos de Dados" 
                    onClick={() => handleSSO('CMD_DB')} 
                  />
                  <QuickActionCard 
                    icon={<Globe className="size-6" />} 
                    title="Gerenciar DNS" 
                    onClick={() => handleSSO('CMD_DNS_CONTROL')} 
                  />
                  <QuickActionCard 
                    icon={<ShieldCheck className="size-6" />} 
                    title="SSL / TLS" 
                    onClick={() => handleSSO('CMD_SSL')} 
                  />
                  <QuickActionCard 
                    icon={<User className="size-6" />} 
                    title="Contas FTP" 
                    onClick={() => handleSSO('CMD_FTP')} 
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function QuickActionCard({ icon, title, onClick }: { icon: React.ReactNode, title: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl bg-card border border-border/50 hover:border-brand/50 hover:shadow-[var(--shadow-card)] transition-all group"
    >
      <div className="p-3 rounded-2xl bg-secondary/50 text-muted-foreground group-hover:text-brand group-hover:bg-brand/10 transition-colors mb-3">
        {icon}
      </div>
      <span className="text-sm font-semibold text-foreground text-center">{title}</span>
    </button>
  );
}
