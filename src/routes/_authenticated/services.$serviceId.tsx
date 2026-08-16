import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  Zap
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceServerDetails, getDASSOUrl } from "@/lib/support.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/services/$serviceId")({
  head: () => ({
    meta: [
      { title: "Gerenciar Serviço — HostPanel" },
    ],
  }),
  component: ServiceManagementPage,
});

function ServiceManagementPage() {
  const { serviceId } = Route.useParams();

  const { data: service, isLoading, error } = useQuery({
    queryKey: ["service-details", serviceId],
    queryFn: async () => {
      console.log('Buscando detalhes do serviço:', serviceId);
      return getServiceServerDetails({ data: serviceId });
    },
  });

  const handleSSO = async (command?: string) => {
    // @ts-ignore - Supabase relations can be tricky with types
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
      error: (err) => `Erro ao acessar painel: ${err.message}`
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl">
            <Link to="/services">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gerenciar Plano</h1>
            <p className="text-muted-foreground text-sm">
              {service?.domain || (isLoading ? "Carregando..." : "Sem domínio")}
            </p>
          </div>
          {service?.status && (
            <Badge className={cn(
              "ml-auto rounded-full px-4 py-1",
              service.status === 'active' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
            )}>
              {service.status === 'active' ? 'Ativo' : service.status}
            </Badge>
          )}
        </div>

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
                      {/* @ts-ignore */}
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
                      {/* @ts-ignore */}
                      <p className="mt-1 font-bold text-foreground">{service.servers?.ip_address || service.servers?.hostname || '---'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-secondary/30">
                      <p className="text-xs text-muted-foreground font-medium uppercase">Servidor</p>
                      {/* @ts-ignore */}
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

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
