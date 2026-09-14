import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
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
import {
  ClientDetailHeader,
  ClientDetailTabs,
  ClientDetailModals,
} from "@/components/admin/clients/details";

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
        <ClientDetailHeader
          client={client}
          isImpersonating={isImpersonating}
          onImpersonate={handleImpersonate}
          onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
        />

        <ClientDetailTabs
          clientId={clientId}
          client={client}
          servers={servers}
          products={products}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onSubmit={handleSubmit}
          isUpdatingProfile={updateProfile.isPending}
          onOpenChangePasswordModal={() => setIsChangePasswordModalOpen(true)}
          onSendPasswordReset={() => sendPasswordResetMutation.mutate()}
          isSendingReset={sendPasswordResetMutation.isPending}
          onAddService={() => setIsAddServiceModalOpen(true)}
          onEditService={(srv) => setEditingService(srv)}
          onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
          onOpenNewInvoiceModal={() => setIsNewInvoiceModalOpen(true)}
          onManageInvoice={(inv) => {
            setManagingInvoice({ ...inv });
            setIsManageInvoiceModalOpen(true);
          }}
        />
      </div>

      <ClientDetailModals
        clientId={clientId}
        client={client}
        servers={servers}
        products={products}
        isBalanceModalOpen={isBalanceModalOpen}
        setIsBalanceModalOpen={setIsBalanceModalOpen}
        editingService={editingService}
        setEditingService={setEditingService}
        isAddServiceModalOpen={isAddServiceModalOpen}
        setIsAddServiceModalOpen={setIsAddServiceModalOpen}
        managingInvoice={managingInvoice}
        setManagingInvoice={setManagingInvoice}
        isManageInvoiceModalOpen={isManageInvoiceModalOpen}
        setIsManageInvoiceModalOpen={setIsManageInvoiceModalOpen}
        isNewInvoiceModalOpen={isNewInvoiceModalOpen}
        setIsNewInvoiceModalOpen={setIsNewInvoiceModalOpen}
        isChangePasswordModalOpen={isChangePasswordModalOpen}
        setIsChangePasswordModalOpen={setIsChangePasswordModalOpen}
        resetLinkResult={resetLinkResult}
        onCloseResetLinkModal={() => setResetLinkResult(null)}
      />
    </AppShell>
  );
}
