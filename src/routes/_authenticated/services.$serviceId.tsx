import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutPanelLeft, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getServiceServerDetails, getDASSOUrl } from "@/lib/support.functions";
import { getAvailableUpgrades, requestServiceUpgrade } from "@/lib/upgrade.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isVPSService } from "@/lib/service-type";
import {
  BlockedServiceAlert,
  ServerDetailsCard,
  ServiceStatusCard,
  ServiceQuickActions,
  ServiceDetailsSkeleton,
  UpgradePlanDialog,
} from "@/components/services";

export const Route = createFileRoute("/_authenticated/services/$serviceId")({
  head: () => ({
    meta: [{ title: "Gerenciar Serviço — Eqsam" }],
  }),
  component: ServiceManagementPage,
});

function ServiceManagementPage() {
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

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
    mutationFn: (targetProductId: string) =>
      requestServiceUpgrade({ data: { serviceId, targetProductId } }),
    onSuccess: (res) => {
      toast.success(`Fatura de upgrade para ${res.targetProductName} gerada com sucesso!`);
      setUpgradeDialogOpen(false);
      navigate({ to: "/invoices/$invoiceId", params: { invoiceId: res.invoiceId } });
    },
    onError: (err: any) => {
      toast.error(`Falha ao solicitar upgrade: ${err.message}`);
    },
  });

  const isDirectAdminBlocked = Boolean(
    service &&
      ((service as any).block_directadmin ||
        service.suspension_reason?.includes("BLOCK_DIRECTADMIN"))
  );

  const handleSSO = async (command?: string) => {
    if (isDirectAdminBlocked) {
      toast.error(
        "Seu acesso ao painel de controle foi temporariamente bloqueado para este serviço. Por favor, entre em contato com o suporte."
      );
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
      toast.error(
        "O usuário ou servidor ainda não foi vinculado a este serviço. Verifique a importação."
      );
      return;
    }

    const promise = (async () => {
      const url = await getDASSOUrl({
        data: {
          // @ts-ignore
          serverId: service.server_id,
          // @ts-ignore
          username: service.username,
          redirectUrl: command || "/",
        },
      });
      window.open(url, "_blank");
      return url;
    })();

    toast.promise(promise, {
      loading: "Gerando acesso seguro ao painel...",
      success: "Redirecionando para o DirectAdmin...",
      error: (err) => {
        const errorMsg = err.message || "";
        if (errorMsg.includes("DA_AUTHENTICATION_ERROR"))
          return "Erro de autenticação com o servidor.";
        if (errorMsg.includes("DA_LOGIN_KEY_IP_NOT_ALLOWED"))
          return "IP não autorizado no servidor.";
        if (errorMsg.includes("DA_PERMISSION_ERROR"))
          return "A chave API não tem permissão para esta ação.";
        if (errorMsg.includes("DA_DIRECTADMIN_BLOCKED"))
          return "Acesso negado: Conta administrativa.";
        if (errorMsg.includes("DA_SERVICE_NOT_ACTIVE"))
          return "Serviço não está ativo.";
        if (errorMsg.includes("DA_INVALID_TARGET_USER"))
          return "Usuário não encontrado no servidor.";

        return `Erro ao acessar painel: ${err.message}`;
      },
    });
  };

  if (error) {
    return (
      <AppShell
        area="client"
        breadcrumb={
          <>
            <Link
              to="/services"
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
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
          <Link
            to="/services"
            className="flex items-center gap-2 hover:text-foreground transition-colors"
          >
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
                {isVPSService(service) ? "Gerenciar VPS" : "Gerenciar Plano"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {service?.domain || (isLoading ? "Carregando..." : "Sem domínio")}
              </p>
            </div>
            {service?.status && (
              <Badge
                className={cn(
                  "rounded-full px-4 py-1",
                  isDirectAdminBlocked
                    ? "bg-destructive text-destructive-foreground"
                    : service.status === "active"
                    ? "bg-success/20 text-success"
                    : "bg-warning/20 text-warning"
                )}
              >
                {isDirectAdminBlocked
                  ? "Bloqueado"
                  : service.status === "active"
                  ? "Ativo"
                  : service.status}
              </Badge>
            )}
          </div>

          {/* Botão e Modal de Upgrade de Plano */}
          {service && service.status === "active" && (
            <UpgradePlanDialog
              open={upgradeDialogOpen}
              onOpenChange={setUpgradeDialogOpen}
              isLoading={isLoadingUpgrades}
              upgradeData={upgradeData}
              onConfirmUpgrade={(targetProductId) =>
                upgradeMutation.mutate(targetProductId)
              }
              isPending={upgradeMutation.isPending}
            />
          )}
        </div>

        {service && isDirectAdminBlocked && <BlockedServiceAlert />}

        {isLoading ? (
          <ServiceDetailsSkeleton />
        ) : (
          service && (
            <>
              <div className="grid gap-6 lg:grid-cols-3">
                <ServerDetailsCard service={service} onSSO={handleSSO} />
                <ServiceStatusCard service={service} />
              </div>

              <ServiceQuickActions
                service={service}
                onSSO={handleSSO}
                onNavigateVPS={(vpsId) =>
                  navigate({ to: "/vps/$vpsId", params: { vpsId } })
                }
              />
            </>
          )
        )}
      </div>
    </AppShell>
  );
}
