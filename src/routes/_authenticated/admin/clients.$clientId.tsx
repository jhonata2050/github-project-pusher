import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { 
  User, 
  Mail, 
  CreditCard, 
  Server, 
  LifeBuoy, 
  History,
  LogIn,
  Database,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { 
  impersonateClient, 
  updateClientProfile, 
  adminSendPasswordReset 
} from "@/lib/admin.functions";
import { logSessionEvent } from "@/lib/audit.functions";
import { getServers, getAllProducts } from "@/lib/support.functions";
import { getClientDossier } from "@/lib/client-dossier.functions";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tabs extraídas
import { ClientInfoTab } from "@/components/admin/clients/tabs/ClientInfoTab";
import { ClientServicesTab } from "@/components/admin/clients/tabs/ClientServicesTab";
import { ClientFinanceTab } from "@/components/admin/clients/tabs/ClientFinanceTab";
import { ClientEmailsTab } from "@/components/admin/clients/tabs/ClientEmailsTab";
import { ClientTicketsTab } from "@/components/admin/clients/tabs/ClientTicketsTab";
import { ClientSystemLogsTab } from "@/components/admin/clients/tabs/ClientSystemLogsTab";
import { ClientProvisioningTab } from "@/components/admin/clients/tabs/ClientProvisioningTab";

// Modals extraídos
import { ClientBalanceModal } from "@/components/admin/clients/modals/ClientBalanceModal";
import { ClientChangePasswordModal } from "@/components/admin/clients/modals/ClientChangePasswordModal";
import { ClientResetLinkModal } from "@/components/admin/clients/modals/ClientResetLinkModal";
import { ClientEditServiceModal } from "@/components/admin/clients/modals/ClientEditServiceModal";
import { ClientAddServiceModal } from "@/components/admin/clients/modals/ClientAddServiceModal";
import { ClientManageInvoiceModal } from "@/components/admin/clients/modals/ClientManageInvoiceModal";
import { ClientNewInvoiceModal } from "@/components/admin/clients/modals/ClientNewInvoiceModal";

export const Route = createFileRoute("/_authenticated/admin/clients/$clientId")({
  head: () => ({
    meta: [
      { title: `Detalhes do Cliente — Eqsam` },
    ],
  }),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(clientDossierQueryOptions(params.clientId)),
      context.queryClient.ensureQueryData(serversQueryOptions),
      context.queryClient.ensureQueryData(productsQueryOptions),
    ]),
  component: ClientDetailPage,
});

const serversQueryOptions = queryOptions({
  queryKey: ["admin-servers"],
  queryFn: () => getServers(),
});

const productsQueryOptions = queryOptions({
  queryKey: ["admin-all-products"],
  queryFn: () => getAllProducts(),
});

const clientDossierQueryOptions = (clientId: string) =>
  queryOptions({
    queryKey: ["admin-client-dossier", clientId],
    queryFn: async () => {
      return getClientDossier({ data: { clientId } });
    },
    staleTime: 0,
  });

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setImpersonatedClientId } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Estados dos modais
  const [editingService, setEditingService] = useState<any>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [managingInvoice, setManagingInvoice] = useState<any>(null);
  const [isManageInvoiceModalOpen, setIsManageInvoiceModalOpen] = useState(false);
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [resetLinkResult, setResetLinkResult] = useState<{ link: string; emailSent: boolean } | null>(null);

  const { data: client } = useSuspenseQuery(clientDossierQueryOptions(clientId));
  const { data: servers } = useSuspenseQuery(serversQueryOptions);
  const { data: products } = useSuspenseQuery(productsQueryOptions);

  const updateProfile = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      return updateClientProfile({ 
        data: { 
          id: clientId, 
          ...values 
        } 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      setIsEditing(false);
      toast.success("Perfil atualizado com sucesso");
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    }
  });

  const executeSendPasswordReset = useServerFn(adminSendPasswordReset);
  const sendPasswordResetMutation = useMutation({
    mutationFn: () => executeSendPasswordReset({ data: { userId: clientId, email: client.email } }),
    onSuccess: (res: any) => {
      if (res?.actionLink) {
        setResetLinkResult({ link: res.actionLink, emailSent: res.emailSent });
        if (res.emailSent) {
          toast.success("E-mail de recuperação enviado e link disponível para cópia!");
        } else {
          toast.success("Link de recuperação gerado!");
        }
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao gerar link de recuperação: " + err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
    const { id, ...values } = raw;
    updateProfile.mutate(values);
  };

  const handleImpersonate = async () => {
    setIsImpersonating(true);
    try {
      await impersonateClient({ data: { clientId } });
      await logSessionEvent({ data: {
        action: "impersonation.started",
        description: "Administrador iniciou o modo cliente",
        entityType: "profile",
        entityId: clientId,
      }});
      setImpersonatedClientId(clientId);
      toast.success("Logado como cliente");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao logar como cliente");
    } finally {
      setIsImpersonating(false);
    }
  };

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <>
          <span>Admin</span>
          <span>/</span>
          <Link to="/admin/clients" className="hover:underline">Clientes</Link>
          <span>/</span>
          <span className="font-medium text-foreground">{client.full_name || client.email}</span>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{client.full_name || "Sem Nome"}</h1>
            <p className="text-sm text-muted-foreground">{client.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsBalanceModalOpen(true)}
              variant="outline"
              className="rounded-xl flex items-center gap-2 h-9 text-xs border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold"
            >
              <Wallet className="size-4 text-emerald-600" />
              <span>Saldo: R$ {Number(client.account_balance || 0).toFixed(2)}</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-500/20 px-1.5 py-0.5 rounded-md font-semibold">+ Ajustar Saldo</span>
            </Button>
            <Button 
              variant="outline" 
              className="rounded-xl flex gap-2 h-9 text-xs flex-1 sm:flex-none"
              onClick={handleImpersonate}
              disabled={isImpersonating}
            >
              <LogIn className="size-4" /> 
              {isImpersonating ? "Acessando..." : "Acessar como Cliente"}
            </Button>
            <Badge className="h-9 px-3 text-xs" variant={client.status === "active" ? "default" : "secondary"}>
              {client.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <div className="overflow-x-auto pb-2">
            <TabsList className="bg-muted/50 p-1 rounded-2xl h-10 w-max min-w-full justify-start sm:w-auto">
              <TabsTrigger value="info" className="rounded-xl flex gap-2 text-xs py-1.5"><User className="size-3.5" /> Dados</TabsTrigger>
              <TabsTrigger value="services" className="rounded-xl flex gap-2 text-xs py-1.5"><Server className="size-3.5" /> Serviços</TabsTrigger>
              <TabsTrigger value="finance" className="rounded-xl flex gap-2 text-xs py-1.5"><CreditCard className="size-3.5" /> Financeiro</TabsTrigger>
              <TabsTrigger value="emails" className="rounded-xl flex gap-2 text-xs py-1.5"><Mail className="size-3.5" /> E-mails</TabsTrigger>
              <TabsTrigger value="tickets" className="rounded-xl flex gap-2 text-xs py-1.5"><LifeBuoy className="size-3.5" /> Tickets</TabsTrigger>
              <TabsTrigger value="provisioning" className="rounded-xl flex gap-2 text-xs py-1.5"><History className="size-3.5" /> Provisionamento</TabsTrigger>
              <TabsTrigger value="system-logs" className="rounded-xl flex gap-2 text-xs py-1.5"><Database className="size-3.5" /> Auditoria</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="info" className="mt-6">
            <ClientInfoTab
              client={client}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              onSubmit={handleSubmit}
              isUpdatingProfile={updateProfile.isPending}
              onOpenChangePasswordModal={() => setIsChangePasswordModalOpen(true)}
              onSendPasswordReset={() => sendPasswordResetMutation.mutate()}
              isSendingReset={sendPasswordResetMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <ClientServicesTab
              services={client.services}
              servers={servers}
              isLoading={false}
              onAddService={() => setIsAddServiceModalOpen(true)}
              onEditService={(srv) => setEditingService(srv)}
            />
          </TabsContent>

          <TabsContent value="finance" className="mt-6">
            <ClientFinanceTab
              accountBalance={Number(client.account_balance || 0)}
              invoices={client.invoices}
              isLoading={false}
              onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
              onOpenNewInvoiceModal={() => setIsNewInvoiceModalOpen(true)}
              onManageInvoice={(inv) => {
                setManagingInvoice({ ...inv });
                setIsManageInvoiceModalOpen(true);
              }}
            />
          </TabsContent>

          <TabsContent value="emails" className="mt-6">
            <ClientEmailsTab
              emailLogs={client.email_logs}
              isLoading={false}
            />
          </TabsContent>

          <TabsContent value="tickets" className="mt-6">
            <ClientTicketsTab
              tickets={client.tickets}
              isLoading={false}
            />
          </TabsContent>

          <TabsContent value="provisioning" className="mt-6">
            <ClientProvisioningTab clientId={clientId} />
          </TabsContent>

          <TabsContent value="system-logs" className="mt-6">
            <ClientSystemLogsTab clientId={clientId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modais de Ação */}
      <ClientBalanceModal
        clientId={clientId}
        isOpen={isBalanceModalOpen}
        onOpenChange={setIsBalanceModalOpen}
      />

      <ClientEditServiceModal
        editingService={editingService}
        setEditingService={setEditingService}
        servers={servers}
        allProducts={products}
        clientId={clientId}
      />

      <ClientAddServiceModal
        isOpen={isAddServiceModalOpen}
        onOpenChange={setIsAddServiceModalOpen}
        clientId={clientId}
        clientName={client.full_name}
        clientEmail={client.email}
        products={products}
        servers={servers}
      />

      <ClientManageInvoiceModal
        managingInvoice={managingInvoice}
        setManagingInvoice={setManagingInvoice}
        isOpen={isManageInvoiceModalOpen}
        onOpenChange={setIsManageInvoiceModalOpen}
        clientId={clientId}
      />

      <ClientNewInvoiceModal
        isOpen={isNewInvoiceModalOpen}
        onOpenChange={setIsNewInvoiceModalOpen}
        clientId={clientId}
        services={client.services}
      />

      <ClientChangePasswordModal
        clientId={clientId}
        clientName={client.full_name}
        clientEmail={client.email}
        isOpen={isChangePasswordModalOpen}
        onOpenChange={setIsChangePasswordModalOpen}
      />

      <ClientResetLinkModal
        result={resetLinkResult}
        onClose={() => setResetLinkResult(null)}
        clientEmail={client.email}
      />
    </AppShell>
  );
}
