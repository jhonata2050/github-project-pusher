import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  CreditCard, 
  Server, 
  LifeBuoy, 
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Send,
  Save,
  LogIn,
  Edit2,
  ExternalLink,
  Link2,
   ShieldAlert,
   Database,
   Monitor,
   Wallet,
   PlusCircle,
   Key,
   Copy,
   Check,
   RotateCcw,
   DollarSign,
   Calendar,
   Percent,
   FileEdit,
   ShieldCheck,
   Eye,
   EyeOff,
   MessageSquare,
   Gift,
 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { 
  impersonateClient, 
  updateClientProfile, 
  adminChangeUserPassword, 
  adminSendPasswordReset 
} from "@/lib/admin.functions";
import { 
  adminUpdateInvoice, 
  adminCreateManualInvoice 
} from "@/lib/finance.functions";
import { logSessionEvent } from "@/lib/audit.functions";
import { adminAdjustUserBalance } from "@/lib/wallet.functions";
import { supabase } from "@/integrations/supabase/client";


import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CountrySelector } from "@/components/app/CountrySelector";
import { countries } from "@/lib/countries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientDossier } from "@/lib/client-dossier.functions";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { getServers, updateServiceDetails, getAllProducts, adminCreateClientService } from "@/lib/support.functions";
import { getAvailableVPSInstances } from "@/lib/vps-admin.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/clients/$clientId")({
  head: ({ params }) => ({
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
  
  // Estado para o modal de edição de serviço
  const [editingService, setEditingService] = useState<any>(null);

  function VPSInstanceSelector({ serviceId, currentVpsId, onSelect }: { serviceId: string, currentVpsId?: string, onSelect?: (val: string) => void }) {
    const { data: vpsInstances, isLoading } = useQuery({
      queryKey: ["available-vps-instances", serviceId],
      queryFn: () => getAvailableVPSInstances({ data: { serviceId } }),
    });

    const [selectedVal, setSelectedVal] = useState<string>(currentVpsId || "none");

    return (
      <div className="space-y-2">
        <input type="hidden" name="vps_instance_id" value={selectedVal} />
        <Select 
          value={selectedVal} 
          onValueChange={(val) => {
            setSelectedVal(val);
            if (onSelect) onSelect(val);
          }}
        >
          <SelectTrigger className="h-9 rounded-xl border-input bg-background shadow-sm text-xs">
            <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione uma instância..."} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/40 shadow-xl">
            <SelectItem value="none">Nenhuma vinculada</SelectItem>
            {vpsInstances?.map((vps: any) => (
              <SelectItem key={vps.id} value={vps.id}>
                {vps.name || 'VPS'} — IP: {vps.ip_address || 'Pendente'} (ID: {vps.external_id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const { data: client } = useSuspenseQuery(clientDossierQueryOptions(clientId));
  const { data: servers } = useSuspenseQuery(serversQueryOptions);
  const { data: products } = useSuspenseQuery(productsQueryOptions);
  const allProducts = products;

  const dossier = {
    invoices: client.invoices,
    services: client.services,
    tickets: client.tickets,
    emailLogs: client.email_logs,
  };
  const dossiersQuery = { isLoading: false, data: dossier };


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

  // Estados para Gestão de Faturas
  const [managingInvoice, setManagingInvoice] = useState<any>(null);
  const [isManageInvoiceModalOpen, setIsManageInvoiceModalOpen] = useState(false);
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);

  // Estados para Nova Fatura Manual
  const [newInvoiceDesc, setNewInvoiceDesc] = useState("");
  const [newInvoiceAmount, setNewInvoiceAmount] = useState("");
  const [newInvoiceDueDate, setNewInvoiceDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [newInvoiceServiceId, setNewInvoiceServiceId] = useState<string>("none");
  const [newInvoiceStatus, setNewInvoiceStatus] = useState<"pending" | "paid">("pending");
  const [newInvoicePaymentMethod, setNewInvoicePaymentMethod] = useState("pix");
  const [newInvoiceNotes, setNewInvoiceNotes] = useState("");

  // Estados para Segurança e Credenciais
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [resetLinkResult, setResetLinkResult] = useState<{ link: string; emailSent: boolean } | null>(null);

  // Server functions
  const executeUpdateInvoice = useServerFn(adminUpdateInvoice);
  const updateInvoiceMutation = useMutation({
    mutationFn: (data: any) => executeUpdateInvoice({ data }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      setIsManageInvoiceModalOpen(false);
      setManagingInvoice(null);
      if (res?.provisioningTriggered) {
        toast.success("Fatura baixada com sucesso! Serviços ativados/renovados.");
      } else {
        toast.success("Fatura atualizada com sucesso!");
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar fatura: " + err.message);
    }
  });

  const executeCreateManualInvoice = useServerFn(adminCreateManualInvoice);
  const createManualInvoiceMutation = useMutation({
    mutationFn: (data: any) => executeCreateManualInvoice({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      setIsNewInvoiceModalOpen(false);
      setNewInvoiceDesc("");
      setNewInvoiceAmount("");
      setNewInvoiceNotes("");
      toast.success("Fatura manual criada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao criar fatura: " + err.message);
    }
  });

  const executeChangePassword = useServerFn(adminChangeUserPassword);
  const changePasswordMutation = useMutation({
    mutationFn: (newPassword: string) => executeChangePassword({ data: { userId: clientId, newPassword } }),
    onSuccess: () => {
      setIsChangePasswordModalOpen(false);
      setNewPasswordValue("");
      toast.success("Senha do cliente alterada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao alterar senha: " + err.message);
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

    // O ID nunca deve ser alterado no body do update
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

  const updateServiceMutation = useMutation({
    mutationFn: (data: any) => updateServiceDetails({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      setEditingService(null);
      toast.success("Serviço atualizado com sucesso");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar serviço: " + err.message);
    }
  });

  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState<"deposit" | "refund" | "bonus" | "adjustment">("bonus");
  const [balanceDesc, setBalanceDesc] = useState("");

  const executeAdjustBalance = useServerFn(adminAdjustUserBalance);

  const adjustBalanceMutation = useMutation({
    mutationFn: (vars: { amount: number; type: any; description: string }) =>
      executeAdjustBalance({ data: { targetUserId: clientId, ...vars } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["client-my-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["client-dashboard-stats"] });
      setIsBalanceModalOpen(false);
      setBalanceAmount("");
      setBalanceDesc("");
      toast.success(`Saldo ajustado com sucesso! Novo saldo: R$ ${res.newBalance.toFixed(2)}`);
    },
    onError: (err: any) => {
      toast.error(`Erro ao ajustar saldo: ${err.message}`);
    }
  });

  const hostingActionMutation = useMutation({
    mutationFn: (vars: { serviceId: string; action: 'suspend' | 'unsuspend' | 'delete' }) => {
      const { hostingAction } = require("@/lib/support.functions");
      return hostingAction({ data: vars });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      toast.success(`Ação ${vars.action} executada com sucesso`);
    },
    onError: (err: any) => {
      toast.error(`Erro ao executar ação: ${err.message}`);
    }
  });

  // Estado para o modal de Adicionar Novo Serviço
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [newServiceProduct, setNewServiceProduct] = useState("");
  const [newServiceBillingCycle, setNewServiceBillingCycle] = useState<"monthly" | "quarterly" | "semiannually" | "annually" | "biennially">("monthly");
  const [newServiceStatus, setNewServiceStatus] = useState<"active" | "pending" | "suspended" | "cancelled">("active");
  const [newServiceNextDue, setNewServiceNextDue] = useState("");
  const [newServiceInvoice, setNewServiceInvoice] = useState(false);
  const [newServiceNotes, setNewServiceNotes] = useState("");

  // Hospedagem Web
  const [newServiceDomain, setNewServiceDomain] = useState("");
  const [newServiceServer, setNewServiceServer] = useState("");
  const [newServiceUsername, setNewServiceUsername] = useState("");
  const [newServicePassword, setNewServicePassword] = useState("");
  const [newServiceProvision, setNewServiceProvision] = useState(false);

  // Servidor VPS
  const [newVpsHostname, setNewVpsHostname] = useState("");
  const [newVpsInstanceId, setNewVpsInstanceId] = useState("");
  const [newVpsIpAddress, setNewVpsIpAddress] = useState("");
  const [newVpsExternalId, setNewVpsExternalId] = useState("");
  const [newVpsOsTemplate, setNewVpsOsTemplate] = useState("Ubuntu 24.04");
  const [newVpsRegion, setNewVpsRegion] = useState("US-east");
  const [newVpsSshUser, setNewVpsSshUser] = useState("root");
  const [newVpsSshPort, setNewVpsSshPort] = useState(22);
  const [newVpsSshPassword, setNewVpsSshPassword] = useState("");

  // Buscar instâncias VPS livres para vinculação rápida
  const { data: availableVpsInstances } = useQuery({
    queryKey: ["admin-available-vps-instances-modal"],
    queryFn: async () => {
      const { data } = await supabase
        .from('vps_instances')
        .select('id, external_id, ip_address, status, region, os_template, service_id');
      return (data || []).filter((i: any) => !i.service_id);
    },
    enabled: isAddServiceModalOpen,
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: any) => adminCreateClientService({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      queryClient.invalidateQueries({ queryKey: ["admin-available-vps-instances-modal"] });
      queryClient.invalidateQueries({ queryKey: ["admin-vps-instances"] });
      setIsAddServiceModalOpen(false);
      setNewServiceProduct("");
      setNewServiceDomain("");
      setNewServiceServer("");
      setNewServiceUsername("");
      setNewServicePassword("");
      setNewServiceNotes("");
      setNewVpsHostname("");
      setNewVpsInstanceId("");
      setNewVpsIpAddress("");
      setNewVpsExternalId("");
      setNewVpsSshPassword("");
      toast.success("Novo serviço adicionado com sucesso ao cliente!");
    },
    onError: (err: any) => {
      toast.error("Erro ao cadastrar serviço: " + err.message);
    }
  });

  const handleCreateServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceProduct) {
      toast.error("Selecione um produto ou plano.");
      return;
    }
    const selectedProd = products?.find((p: any) => p.id === newServiceProduct);
    const isHosting = selectedProd?.product_type === 'hosting';
    const isVPS = selectedProd?.product_type === 'vps';

    createServiceMutation.mutate({
      clientId,
      productId: newServiceProduct,
      billingCycle: newServiceBillingCycle,
      status: newServiceStatus,
      nextDueDate: newServiceNextDue ? new Date(newServiceNextDue).toISOString() : null,
      generateInvoice: newServiceInvoice,
      notes: newServiceNotes || null,
      // Hospedagem
      domain: isHosting ? (newServiceDomain || null) : (newVpsHostname || newServiceDomain || null),
      serverId: isHosting ? (newServiceServer || null) : null,
      username: isHosting ? (newServiceUsername || null) : (newVpsSshUser || null),
      password: isHosting ? (newServicePassword || null) : (newVpsSshPassword || null),
      provisionServer: isHosting ? newServiceProvision : false,
      // VPS
      vpsHostname: isVPS ? (newVpsHostname || null) : null,
      vpsInstanceId: isVPS ? (newVpsInstanceId || null) : null,
      vpsIpAddress: isVPS ? (newVpsIpAddress || null) : null,
      vpsExternalId: isVPS ? (newVpsExternalId || null) : null,
      vpsOsTemplate: isVPS ? (newVpsOsTemplate || null) : null,
      vpsRegion: isVPS ? (newVpsRegion || null) : null,
      vpsSshUser: isVPS ? (newVpsSshUser || 'root') : null,
      vpsSshPort: isVPS ? (Number(newVpsSshPort) || 22) : null,
      vpsSshPassword: isVPS ? (newVpsSshPassword || null) : null,
    });
  };

  const handleUpdateService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateServiceMutation.mutate({
      serviceId: editingService.id,
      username: formData.get("username") as string || null,
      domain: formData.get("domain") as string || null,
      server_id: formData.get("server_id") as string || null,
      product_id: formData.get("product_id") as string || null,
      next_due_date: formData.get("next_due_date") as string || null,
      status: formData.get("status") as any || null,
      block_directadmin: formData.get("block_directadmin_service") === 'true',
      password: formData.get("da_password") as string || null,
      vps_instance_id: formData.get("vps_instance_id") as string || null,
    });
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

          <TabsContent value="system-logs" className="mt-6">
            <Card className="rounded-3xl border-none bg-card shadow-sm overflow-hidden">
               <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="size-4 text-brand" /> Logs de Auditoria do Cliente
                  </CardTitle>
                  <CardDescription>Histórico detalhado de conflitos e segurança.</CardDescription>
               </CardHeader>
               <CardContent className="p-0">
                  <SystemLogsList clientId={clientId} />
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="mt-6">
            <Card className="rounded-3xl border-none bg-card shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div>
                  <CardTitle className="text-lg">Informações do Cliente</CardTitle>
                  <CardDescription className="text-xs">Dados pessoais e de contato</CardDescription>
                </div>
                {!isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(true)} className="rounded-xl h-9 text-xs">
                    Editar Dados
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pb-6">
                <form 
                  onSubmit={handleSubmit} 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input id="full_name" name="full_name" defaultValue={client.full_name || ""} disabled={!isEditing} className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail de Acesso e Contato</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email"
                      defaultValue={client.email || ""} 
                      disabled={!isEditing} 
                      className={cn("rounded-xl h-11", !isEditing && "bg-muted/30")} 
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {isEditing 
                        ? "Alterar o e-mail atualizará simultaneamente o login e as notificações do cliente." 
                        : "E-mail de acesso e notificações."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Empresa</Label>
                    <Input id="company_name" name="company_name" defaultValue={client.company_name || ""} disabled={!isEditing} className="rounded-xl h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="identification_type">Tipo de Documento</Label>
                      <Select 
                        defaultValue={(client as any).identification_type || "cpf"} 
                        disabled={!isEditing}
                        onValueChange={(val) => {
                          const el = document.getElementById('identification_type_hidden') as HTMLInputElement;
                          if (el) el.value = val;
                        }}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-input bg-background shadow-sm">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/40 shadow-xl">
                          <SelectItem value="cpf">CPF (Pessoa Física)</SelectItem>
                          <SelectItem value="cnpj">CNPJ (Empresa)</SelectItem>
                          <SelectItem value="tax_id">Tax ID (Internacional)</SelectItem>
                          <SelectItem value="passport">Passaporte</SelectItem>
                        </SelectContent>
                      </Select>
                      <input type="hidden" id="identification_type_hidden" name="identification_type" defaultValue={(client as any).identification_type || "cpf"} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax_id">Documento (ID)</Label>
                      <Input id="tax_id" name="tax_id" defaultValue={client.tax_id || ""} disabled={!isEditing} className="rounded-xl h-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <div className="relative">
                      <Input 
                        id="phone" 
                        name="phone" 
                        defaultValue={client.phone || ""} 
                        disabled={!isEditing} 
                        className="rounded-xl h-11 pl-12" 
                        placeholder="Número (Ex: 11988887777)"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground bg-muted/50 px-1 py-0.5 rounded">
                        {countries.find(c => c.code === ((client as any).country || "BR"))?.ddi}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      defaultValue={client.status} 
                      disabled={!isEditing}
                      onValueChange={(val) => {
                        const el = document.getElementById('status_hidden') as HTMLInputElement;
                        if (el) el.value = val;
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-input bg-background shadow-sm">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/40 shadow-xl">
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" id="status_hidden" name="status" defaultValue={client.status} />
                  </div>

                  <div className="col-span-full border-t pt-4 mt-2">
                    <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                      <MapPin className="size-4" /> Endereço
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_line">Logradouro</Label>
                    <Input id="address_line" name="address_line" defaultValue={client.address_line || ""} disabled={!isEditing} className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address_line2">Complemento / Bairro</Label>
                    <Input id="address_line2" name="address_line2" defaultValue={(client as any).address_line2 || ""} disabled={!isEditing} className="rounded-xl h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input id="city" name="city" defaultValue={client.city || ""} disabled={!isEditing} className="rounded-xl h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado / Província</Label>
                      <Input id="state" name="state" defaultValue={client.state || ""} disabled={!isEditing} className="rounded-xl h-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <CountrySelector
                      value={(client as any).country || "BR"}
                      onChange={(val) => {
                        // Forçamos a atualização do campo no form se houver um ref ou lidar via handleSubmit
                        const el = document.getElementById('country_hidden') as HTMLInputElement;
                        if (el) el.value = val;
                      }}
                      disabled={!isEditing}
                      className="h-11"
                    />
                    <input type="hidden" id="country_hidden" name="country" defaultValue={(client as any).country || "BR"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">CEP / Zip Code</Label>
                    <Input id="postal_code" name="postal_code" defaultValue={client.postal_code || ""} disabled={!isEditing} className="rounded-xl h-11" />
                  </div>

                  {isEditing && (
                    <div className="col-span-full flex justify-end gap-3 mt-4">
                      <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl h-11">
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={updateProfile.isPending} className="rounded-xl h-11 bg-brand text-brand-foreground hover:bg-brand/90 flex gap-2">
                        <Save className="size-4" /> Salvar Alterações
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Card de Segurança e Credenciais do Cliente */}
            <Card className="rounded-3xl border-none bg-card shadow-sm mt-6">
              <CardHeader className="py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="size-5 text-brand" /> Segurança & Acesso do Cliente
                </CardTitle>
                <CardDescription className="text-xs">
                  Gerencie as credenciais de acesso, redefina senhas ou gere links de recuperação imediata para suporte.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                        <Key className="size-4 text-brand" />
                        <span>Alterar Senha do Cliente</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Defina uma nova senha imediatamente para o cliente sem necessidade de confirmação por e-mail.
                      </p>
                    </div>
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => {
                        setNewPasswordValue("");
                        setIsChangePasswordModalOpen(true);
                      }}
                      className="rounded-xl w-full gap-2 border-brand/40 text-brand hover:bg-brand/10"
                    >
                      <Key className="size-4" /> Alterar Senha Diretamente
                    </Button>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                        <Send className="size-4 text-blue-500" />
                        <span>Link de Redefinição de Senha</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Gera um link seguro de recuperação para enviar ao cliente pelo WhatsApp ou ticket de suporte.
                      </p>
                    </div>
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => sendPasswordResetMutation.mutate()}
                      disabled={sendPasswordResetMutation.isPending}
                      className="rounded-xl w-full gap-2 border-blue-500/40 text-blue-600 hover:bg-blue-500/10"
                    >
                      <ExternalLink className="size-4" /> {sendPasswordResetMutation.isPending ? "Gerando link..." : "Gerar Link de Redefinição"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Serviços Contratados</CardTitle>
                  <CardDescription className="text-xs">Hospedagem, servidores VPS, domínios e outros</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const nextDate = new Date();
                    nextDate.setDate(nextDate.getDate() + 30);
                    setNewServiceNextDue(nextDate.toISOString().split("T")[0] || "");
                    setIsAddServiceModalOpen(true);
                  }}
                  className="rounded-xl h-9 gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90 shrink-0 font-medium"
                >
                  <PlusCircle className="size-4" /> Adicionar Serviço
                </Button>
              </CardHeader>
              <CardContent>
                {dossiersQuery.isLoading ? <Skeleton className="h-40" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Serviço</TableHead>
                          <TableHead className="whitespace-nowrap">Domínio</TableHead>
                          <TableHead className="hidden sm:table-cell">Servidor / VPS</TableHead>
                          <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-20 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dossiersQuery.data?.services.map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium text-xs">
                              <div className="flex flex-col gap-1">
                                <span>
                                  {s.products?.name || "Produto"}
                                  {s.products?.product_type === 'vps' && (
                                    <Badge variant="outline" className="ml-2 text-[8px] h-3.5 border-brand/30 text-brand bg-brand/5">VPS</Badge>
                                  )}
                                </span>
                                <div className="flex flex-col gap-0.5">
                                  {s.username ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[10px] text-muted-foreground font-mono">Usuário: {s.username}</span>
                                      {s.password && (
                                        <span className="text-[9px] text-muted-foreground font-mono">Senha: {s.password ? '********' : '—'}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-destructive italic">Usuário ausente</span>
                                  )}
                                  {s.notes && (
                                    <div className="flex items-start gap-1 mt-1 p-1.5 rounded-lg bg-red-500/5 border border-red-500/10 max-w-[200px]">
                                      <ShieldAlert className="size-3 text-red-500 shrink-0 mt-0.5" />
                                      <span className="text-[9px] text-red-600 font-bold leading-tight break-words">
                                        {s.notes}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {s.domain || "—"}
                            </TableCell>
                             <TableCell className="hidden sm:table-cell">
                               {s.server_id || s.servers ? (
                                 <span className="text-xs">
                                   {(s.servers?.hostname || servers?.find(sv => sv.id === s.server_id)?.hostname) || "Servidor"}
                                 </span>
                               ) : (s.vps_instances && s.vps_instances.length > 0) ? (
                                 <div className="flex flex-col gap-0.5">
                                   <Link 
                                     to="/admin/vps" 
                                     className="text-xs font-medium text-brand hover:underline flex items-center gap-1"
                                   >
                                     <Monitor className="size-3" /> {s.vps_instances[0].name || s.vps_instances[0].ip_address || "Instância VPS"}
                                   </Link>
                                   <span className="text-[10px] text-muted-foreground font-mono">
                                     IP: {s.vps_instances[0].ip_address || "Pendente"} (ID: {s.vps_instances[0].external_id})
                                   </span>
                                 </div>
                               ) : (s.products?.product_type === 'vps' || s.billing_cycle === 'vps') ? (
                                 <Link 
                                   to="/admin/vps" 
                                   className="text-[10px] text-brand hover:underline flex items-center gap-1"
                                 >
                                   <Link2 className="size-3" /> Vincular VPS
                                 </Link>
                               ) : (
                                 <span className="text-[10px] text-destructive italic">Não vinculado</span>
                               )}
                             </TableCell>
                            <TableCell className="hidden md:table-cell text-xs">
                              {s.next_due_date ? format(new Date(s.next_due_date), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge className="text-[10px] uppercase px-1.5 h-5" variant={s.status === 'active' ? 'default' : s.status === 'suspended' ? 'secondary' : 'destructive'}>
                                {s.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {s.status === 'active' && (
                                  s.products?.product_type === 'vps' && s.vps_instances?.[0]?.id ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 rounded-lg text-brand hover:text-brand hover:bg-brand/10"
                                      asChild
                                    >
                                      <Link to="/admin/vps" title="Ver VPS no Painel Admin">
                                        <Monitor className="size-3" />
                                      </Link>
                                    </Button>
                                  ) : (s.username && s.server_id && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 rounded-lg text-brand hover:text-brand hover:bg-brand/10"
                                      onClick={async () => {
                                        const { getDASSOUrl } = await import("@/lib/support.functions");
                                        const promise = (async () => {
                                          const url = await getDASSOUrl({ data: { serverId: s.server_id, username: s.username, redirectUrl: '/' } });
                                          window.open(url, '_blank');
                                          return url;
                                        })();

                                        toast.promise(promise, {
                                          loading: 'Gerando acesso...',
                                          success: 'Redirecionando...',
                                          error: (err) => `Erro: ${err.message}`
                                        });
                                      }}
                                      title="Acessar Painel"
                                    >
                                      <ExternalLink className="size-3" />
                                    </Button>
                                  ))
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="size-8 rounded-lg"
                                  onClick={() => setEditingService(s)}
                                  title="Editar Detalhes"
                                >
                                  <Edit2 className="size-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                        {dossiersQuery.data?.services.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum serviço encontrado</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance" className="mt-6 space-y-6">
            {/* Card de Saldo da Carteira */}
            <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-emerald-500/20 text-emerald-600 rounded-2xl">
                    <Wallet className="size-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Saldo da Carteira do Cliente</p>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-0.5">
                      R$ {Number(client.account_balance || 0).toFixed(2)}
                    </h3>
                  </div>
                </div>
                <div>
                  <Button 
                    onClick={() => setIsBalanceModalOpen(true)}
                    className="rounded-2xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <PlusCircle className="size-4" /> Ajustar Saldo / Conceder Crédito
                  </Button>
                </div>
              </div>
            </Card>

            {/* Modal de Ajuste de Saldo */}
            <Dialog open={isBalanceModalOpen} onOpenChange={setIsBalanceModalOpen}>
              <DialogContent className="rounded-3xl max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wallet className="size-5 text-emerald-600" /> Ajustar Saldo do Cliente
                  </DialogTitle>
                  <DialogDescription>
                    Adicione créditos, estornos ou bônus diretamente na carteira deste cliente.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tipo de Ajuste</Label>
                    <select
                      value={balanceType}
                      onChange={(e: any) => setBalanceType(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="bonus">Bônus / Cortesia (+)</option>
                      <option value="deposit">Depósito Manual (+)</option>
                      <option value="refund">Estorno de Fatura / Reembolso (+)</option>
                      <option value="adjustment">Ajuste / Correção</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Valor (R$)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      placeholder="Ex: 50.00 (ou negativo para debitar)"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      className="rounded-xl font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Motivo / Descrição</Label>
                    <Input 
                      placeholder="Ex: Crédito concedido pelo suporte técnico"
                      value={balanceDesc}
                      onChange={(e) => setBalanceDesc(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsBalanceModalOpen(false)}
                    className="rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    disabled={adjustBalanceMutation.isPending || !balanceAmount}
                    onClick={() => {
                      const amount = parseFloat(balanceAmount);
                      if (isNaN(amount) || amount === 0) {
                        toast.error("Informe um valor válido.");
                        return;
                      }
                      adjustBalanceMutation.mutate({
                        amount,
                        type: balanceType,
                        description: balanceDesc || "Ajuste manual de saldo",
                      });
                    }}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {adjustBalanceMutation.isPending ? "Salvando..." : "Confirmar Ajuste"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Histórico Financeiro</CardTitle>
                  <CardDescription className="text-xs">Faturas pagas, pendentes e canceladas</CardDescription>
                </div>
                <Button 
                  size="sm"
                  onClick={() => setIsNewInvoiceModalOpen(true)}
                  className="rounded-xl h-9 gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90 shrink-0 font-medium"
                >
                  <PlusCircle className="size-4" /> Nova Fatura Manual
                </Button>
              </CardHeader>
              <CardContent>
                {dossiersQuery.isLoading ? <Skeleton className="h-40" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Fatura</TableHead>
                          <TableHead className="whitespace-nowrap">Valor</TableHead>
                          <TableHead className="whitespace-nowrap">Vencimento</TableHead>
                          <TableHead className="hidden sm:table-cell whitespace-nowrap">Pago em</TableHead>
                          <TableHead className="hidden md:table-cell">Método</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {dossiersQuery.data?.invoices.map((inv: any) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="font-bold">#{inv.id.slice(0, 8)}</span>
                              {inv.notes && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={inv.notes}>
                                  {inv.notes}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold">R$ {Number(inv.total_amount).toFixed(2)}</span>
                            {Number(inv.discount_amount) > 0 && (
                              <span className="text-[10px] text-emerald-600 block">
                                Desc: R$ {Number(inv.discount_amount).toFixed(2)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(inv.due_date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs">
                            {inv.paid_at ? format(new Date(inv.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs capitalize text-muted-foreground">
                            {inv.payment_method || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={inv.status === 'paid' ? 'default' : inv.status === 'overdue' ? 'destructive' : 'secondary'}
                              className="text-[10px] uppercase font-bold"
                            >
                              {inv.status === 'paid' ? 'Pago' : inv.status === 'pending' ? 'Pendente' : inv.status === 'overdue' ? 'Vencida' : inv.status === 'cancelled' ? 'Cancelada' : inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl h-8 text-xs gap-1.5 border-brand/30 text-brand hover:bg-brand/10 font-semibold"
                              onClick={() => {
                                setManagingInvoice({ ...inv });
                                setIsManageInvoiceModalOpen(true);
                              }}
                            >
                              <FileEdit className="size-3.5" /> Gerenciar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {dossiersQuery.data?.invoices.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhuma fatura encontrada</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="mt-6">
            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader>
                <CardTitle>Histórico de Comunicação</CardTitle>
                <CardDescription>E-mails enviados pelo sistema</CardDescription>
              </CardHeader>
              <CardContent>
                {dossiersQuery.isLoading ? <Skeleton className="h-40" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Data</TableHead>
                          <TableHead className="whitespace-nowrap">Assunto</TableHead>
                          <TableHead className="hidden sm:table-cell whitespace-nowrap">Template</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {dossiersQuery.data?.emailLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">
                            {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">{log.subject}</TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">{log.template_name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] h-5">
                              {log.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {dossiersQuery.data?.emailLogs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Nenhum log de e-mail encontrado</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="mt-6">
             <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader>
                <CardTitle>Suporte</CardTitle>
                <CardDescription>Tickets abertos e resolvidos</CardDescription>
              </CardHeader>
              <CardContent>
                {dossiersQuery.isLoading ? <Skeleton className="h-40" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Assunto</TableHead>
                          <TableHead className="hidden sm:table-cell whitespace-nowrap">Data</TableHead>
                          <TableHead className="hidden md:table-cell whitespace-nowrap">Prioridade</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {dossiersQuery.data?.tickets.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.subject}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {format(new Date(t.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">{t.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.status === 'open' ? 'default' : 'secondary'}>
                              {t.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {dossiersQuery.data?.tickets.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Nenhum ticket encontrado</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="provisioning" className="mt-6">
            <ProvisioningLogsTable clientId={clientId} />
          </TabsContent>
        </Tabs>

      </div>

      <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
        <DialogContent className="rounded-3xl border-none shadow-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Gerenciar Serviço</DialogTitle>
            <DialogDescription className="text-xs">
              Ajuste manualmente os detalhes técnicos para sincronização com o servidor.
            </DialogDescription>
          </DialogHeader>
          {editingService && (
            <form onSubmit={handleUpdateService} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="product_id" className="text-xs">Produto / Plano</Label>
                <Select 
                  name="product_id" 
                  defaultValue={editingService.product_id || ""}
                >
                  <SelectTrigger id="product_id" className="h-9 rounded-xl border-input bg-background shadow-sm text-xs">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 shadow-xl">
                    <SelectItem value="none">Selecione um produto</SelectItem>
                    {allProducts?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editingService.products?.product_type === 'vps' || editingService.billing_cycle === 'vps' ? (
                <>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="vps_instance_id" className="text-xs font-bold text-brand">Vincular Instância VPS</Label>
                    <VPSInstanceSelector 
                      serviceId={editingService.id} 
                      currentVpsId={Array.isArray(editingService.vps_instances) ? editingService.vps_instances[0]?.id : editingService.vps_instances?.id} 
                    />
                  </div>
                  
                  {editingService.vps_instances && (Array.isArray(editingService.vps_instances) ? editingService.vps_instances.length > 0 : true) && (() => {
                    const vps = Array.isArray(editingService.vps_instances) ? editingService.vps_instances[0] : editingService.vps_instances;
                    return (
                      <div className="sm:col-span-2 p-3 rounded-2xl bg-brand/5 border border-brand/10 space-y-2">
                        <h4 className="text-[10px] font-bold text-brand uppercase tracking-wider flex items-center gap-1">
                          <Monitor className="size-3" /> Detalhes da VPS Vinculada: {vps.name || 'VPS'}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[9px] text-muted-foreground">IP Principal</p>
                            <p className="text-xs font-mono font-bold text-brand">{vps.ip_address || "Aguardando..."}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-muted-foreground">External ID</p>
                            <p className="text-xs font-mono">{vps.external_id || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-muted-foreground">Status</p>
                            <Badge variant="outline" className="text-[9px] uppercase h-4 px-1 border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                              {vps.status || "Ativo"}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-[9px] text-muted-foreground">Região / SO</p>
                            <p className="text-[10px] font-medium">{vps.region || "US"} · {vps.os_template || "Linux"}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="username" className="text-xs">Usuário do Servidor (SSO)</Label>
                    <Input 
                      id="username" 
                      name="username" 
                      defaultValue={editingService.username || ""} 
                      placeholder="Ex: abacap123" 
                      className="rounded-xl h-9 text-xs" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="da_password" className="text-xs">Senha do Servidor (SSO)</Label>
                    <Input 
                      id="da_password" 
                      name="da_password" 
                      defaultValue={editingService.password || ""} 
                      placeholder="Deixe vazio para manter a atual" 
                      className="rounded-xl h-9 text-xs" 
                      type="password"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="server_id" className="text-xs">Servidor Vinculado</Label>
                    <Select 
                      name="server_id" 
                      defaultValue={editingService.server_id || ""}
                    >
                      <SelectTrigger id="server_id" className="h-9 rounded-xl border-input bg-background shadow-sm text-xs">
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/40 shadow-xl">
                        <SelectItem value="none">Nenhum</SelectItem>
                        {servers?.map((sv) => (
                          <SelectItem key={sv.id} value={sv.id}>{sv.hostname}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="grid gap-2">
                <Label htmlFor="domain" className="text-xs">Domínio / Hostname</Label>
                <Input 
                  id="domain" 
                  name="domain" 
                  defaultValue={editingService.domain || ""} 
                  placeholder="dominio.com.br" 
                  className="rounded-xl h-9 text-xs" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="next_due_date" className="text-xs">Data de Vencimento</Label>
                <Input 
                  type="date"
                  id="next_due_date" 
                  name="next_due_date" 
                  defaultValue={editingService.next_due_date ? editingService.next_due_date.split('T')[0] : ""} 
                  className="rounded-xl h-9 text-xs" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status" className="text-xs">Status</Label>
                <Select 
                  name="status" 
                  defaultValue={editingService.status}
                >
                  <SelectTrigger id="status" className="h-9 rounded-xl border-input bg-background shadow-sm text-xs">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 shadow-xl">
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                    <SelectItem value="terminated">Terminado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {!(editingService.products?.product_type === 'vps' || editingService.billing_cycle === 'vps') && (
                <div className="col-span-full border-t pt-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-destructive/5 border border-destructive/10 mb-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="block_directadmin_service" className="text-base font-semibold text-destructive flex items-center gap-2">
                        <ShieldAlert className="size-4" /> Bloquear Acesso
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Impede o acesso ao painel deste serviço específico.
                      </p>
                    </div>
                    <Switch 
                      id="block_directadmin_service" 
                      checked={editingService.block_directadmin || false} 
                      onCheckedChange={(checked) => {
                        setEditingService({ ...editingService, block_directadmin: checked });
                        const el = document.getElementById('block_directadmin_service_hidden') as HTMLInputElement;
                        if (el) el.value = checked ? 'true' : 'false';
                      }}
                    />
                    <input type="hidden" id="block_directadmin_service_hidden" name="block_directadmin_service" value={editingService.block_directadmin ? 'true' : 'false'} />
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                {editingService.status === 'active' ? (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50 h-11"
                    onClick={() => hostingActionMutation.mutate({ serviceId: editingService.id, action: 'suspend' })}
                    disabled={hostingActionMutation.isPending}
                  >
                    Suspender
                  </Button>
                ) : editingService.status === 'suspended' ? (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 rounded-xl text-green-600 border-green-200 hover:bg-green-50 h-11"
                    onClick={() => hostingActionMutation.mutate({ serviceId: editingService.id, action: 'unsuspend' })}
                    disabled={hostingActionMutation.isPending}
                  >
                    Reativar
                  </Button>
                ) : null}
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 rounded-xl text-red-600 border-red-200 hover:bg-red-50 h-11"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja DELETAR esta conta no servidor? Esta ação é irreversível.")) {
                      hostingActionMutation.mutate({ serviceId: editingService.id, action: 'delete' });
                    }
                  }}
                  disabled={hostingActionMutation.isPending}
                >
                  Deletar no Server
                </Button>
              </div>

              <DialogFooter className="pt-4">
                <Button 
                  type="submit" 
                  disabled={updateServiceMutation.isPending} 
                  className="bg-brand text-brand-foreground w-full rounded-2xl h-11 font-bold text-sm"
                >
                  {updateServiceMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Novo Serviço ao Cliente */}
      <Dialog open={isAddServiceModalOpen} onOpenChange={setIsAddServiceModalOpen}>
        <DialogContent className="max-w-xl rounded-3xl border-none p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <PlusCircle className="size-5 text-brand" /> Adicionar Serviço ao Cliente
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre um novo plano de hospedagem, servidor VPS ou outro serviço para <strong>{client.full_name || client.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateServiceSubmit} className="space-y-4 pt-2">
            {/* Seleção de Produto / Plano */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Produto / Plano *</Label>
              <Select
                value={newServiceProduct}
                onValueChange={(val) => {
                  setNewServiceProduct(val);
                  const prod = products?.find((p: any) => p.id === val);
                  if (prod?.product_type === 'vps') {
                    if (!newVpsHostname) setNewVpsHostname(`vps-${client.full_name?.toLowerCase().replace(/\s+/g, '') || 'instancia'}`);
                  }
                }}
                required
              >
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="Selecione o plano..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {products?.map((prod: any) => (
                    <SelectItem key={prod.id} value={prod.id}>
                      {prod.name} — {prod.product_type === 'vps' ? 'Servidor VPS' : 'Hospedagem Web'}{prod.directadmin_package ? ` (Pacote: ${prod.directadmin_package})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SEÇÃO DINÂMICA: HOSPEDAGEM WEB */}
            {(() => {
              const selectedProd = products?.find((p: any) => p.id === newServiceProduct);
              const isHosting = !selectedProd || selectedProd.product_type === 'hosting';
              const isVPS = selectedProd?.product_type === 'vps';

              if (isHosting) {
                return (
                  <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border">
                    <div className="flex items-center gap-2 text-xs font-semibold text-brand">
                      <Server className="size-4" /> Configurações da Hospedagem Web
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Domínio */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Domínio Principal *</Label>
                        <Input
                          placeholder="ex: meusite.com.br"
                          value={newServiceDomain}
                          onChange={(e) => {
                            const dom = e.target.value;
                            setNewServiceDomain(dom);
                            if (!newServiceUsername && dom.includes(".")) {
                              const firstPart = dom.split(".")[0] || "";
                              const cleanUser = firstPart.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();
                              setNewServiceUsername(cleanUser);
                            }
                          }}
                          className="rounded-xl h-10"
                          required={isHosting}
                        />
                      </div>

                      {/* Servidor */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Servidor DirectAdmin</Label>
                        <Select value={newServiceServer} onValueChange={setNewServiceServer}>
                          <SelectTrigger className="rounded-xl h-10">
                            <SelectValue placeholder="Selecione o servidor..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {servers?.map((srv: any) => (
                              <SelectItem key={srv.id} value={srv.id}>
                                {srv.name || srv.hostname} ({srv.type?.toUpperCase() || 'DA'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Usuário */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">Usuário cPanel/DA</Label>
                          <button
                            type="button"
                            onClick={() => {
                              const rand = "usr" + Math.floor(1000 + Math.random() * 9000);
                              setNewServiceUsername(rand);
                            }}
                            className="text-[10px] text-brand hover:underline"
                          >
                            Gerar
                          </button>
                        </div>
                        <Input
                          placeholder="ex: cliente01"
                          value={newServiceUsername}
                          onChange={(e) => setNewServiceUsername(e.target.value)}
                          className="rounded-xl h-10 font-mono text-xs"
                        />
                      </div>

                      {/* Senha */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">Senha de Acesso</Label>
                          <button
                            type="button"
                            onClick={() => {
                              const pass = "Eqsam#" + Math.random().toString(36).slice(-8) + "!";
                              setNewServicePassword(pass);
                            }}
                            className="text-[10px] text-brand hover:underline"
                          >
                            Gerar Forte
                          </button>
                        </div>
                        <Input
                          placeholder="ex: Senha#Forte123"
                          value={newServicePassword}
                          onChange={(e) => setNewServicePassword(e.target.value)}
                          className="rounded-xl h-10 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-background border">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-semibold cursor-pointer">Provisionar Imediatamente no Servidor</Label>
                        <p className="text-[10px] text-muted-foreground">
                          Cria a conta no DirectAdmin agora via API no servidor selecionado.
                        </p>
                      </div>
                      <Switch
                        checked={newServiceProvision}
                        onCheckedChange={setNewServiceProvision}
                      />
                    </div>
                  </div>
                );
              }

              if (isVPS) {
                return (
                  <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border">
                    <div className="flex items-center gap-2 text-xs font-semibold text-brand">
                      <Monitor className="size-4" /> Configurações do Servidor VPS
                    </div>

                    {/* Opção de Vincular Instância Contabo Existente */}
                    {availableVpsInstances && availableVpsInstances.length > 0 && (
                      <div className="space-y-1.5 p-3 rounded-xl bg-brand/5 border border-brand/20">
                        <Label className="text-xs font-semibold text-brand">Vincular Instância Sincronizada da Contabo (Opcional)</Label>
                        <Select
                          value={newVpsInstanceId}
                          onValueChange={(instId) => {
                            setNewVpsInstanceId(instId);
                            if (instId && instId !== 'manual') {
                              const match = availableVpsInstances.find((i: any) => i.id === instId);
                              if (match) {
                                setNewVpsHostname(match.ip_address ? `vps-${match.ip_address.replace(/\./g, '-')}` : `vps-${match.external_id}`);
                                setNewVpsIpAddress(match.ip_address || '');
                                setNewVpsExternalId(match.external_id || '');
                                if (match.region) setNewVpsRegion(match.region);
                                if (match.os_template) setNewVpsOsTemplate(match.os_template);
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="rounded-xl h-10 bg-background">
                            <SelectValue placeholder="Selecione um servidor Contabo não vinculado..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="manual">Configurar Manualmente</SelectItem>
                            {availableVpsInstances.map((inst: any) => (
                              <SelectItem key={inst.id} value={inst.id}>
                                {inst.ip_address ? `VPS ${inst.ip_address}` : 'Instância VPS'} (ID: {inst.external_id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Hostname / Nome */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Hostname / Nome da VPS *</Label>
                        <Input
                          placeholder="ex: vps-streambr.eqsam.com"
                          value={newVpsHostname}
                          onChange={(e) => setNewVpsHostname(e.target.value)}
                          className="rounded-xl h-10"
                          required
                        />
                      </div>

                      {/* IP */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Endereço IP</Label>
                        <Input
                          placeholder="ex: 154.53.35.8"
                          value={newVpsIpAddress}
                          onChange={(e) => setNewVpsIpAddress(e.target.value)}
                          className="rounded-xl h-10 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* External ID */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">External ID (Contabo)</Label>
                        <Input
                          placeholder="ex: 203016028"
                          value={newVpsExternalId}
                          onChange={(e) => setNewVpsExternalId(e.target.value)}
                          className="rounded-xl h-10 font-mono text-xs"
                        />
                      </div>

                      {/* SO Template */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Sistema Operacional</Label>
                        <Select value={newVpsOsTemplate} onValueChange={setNewVpsOsTemplate}>
                          <SelectTrigger className="rounded-xl h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Ubuntu 24.04">Ubuntu 24.04 LTS</SelectItem>
                            <SelectItem value="Ubuntu 22.04">Ubuntu 22.04 LTS</SelectItem>
                            <SelectItem value="Debian 12">Debian 12</SelectItem>
                            <SelectItem value="AlmaLinux 9">AlmaLinux 9</SelectItem>
                            <SelectItem value="Windows Server 2022">Windows Server</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Região */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Região / Datacenter</Label>
                        <Select value={newVpsRegion} onValueChange={setNewVpsRegion}>
                          <SelectTrigger className="rounded-xl h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="US-east">Estados Unidos (US)</SelectItem>
                            <SelectItem value="EU-central">Europa (Alemanha)</SelectItem>
                            <SelectItem value="BR">Brasil (BR)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Acesso SSH */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Usuário SSH</Label>
                        <Input
                          value={newVpsSshUser}
                          onChange={(e) => setNewVpsSshUser(e.target.value)}
                          className="rounded-xl h-10 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Porta SSH</Label>
                        <Input
                          type="number"
                          value={newVpsSshPort}
                          onChange={(e) => setNewVpsSshPort(Number(e.target.value))}
                          className="rounded-xl h-10 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">Senha SSH</Label>
                          <button
                            type="button"
                            onClick={() => {
                              const pass = "EqsamVPS#" + Math.random().toString(36).slice(-8) + "!";
                              setNewVpsSshPassword(pass);
                            }}
                            className="text-[10px] text-brand hover:underline"
                          >
                            Gerar
                          </button>
                        </div>
                        <Input
                          placeholder="Senha de root..."
                          value={newVpsSshPassword}
                          onChange={(e) => setNewVpsSshPassword(e.target.value)}
                          className="rounded-xl h-10 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })()}

            {/* CAMPOS COMUNS DE FATURAMENTO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Ciclo de Faturamento */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ciclo</Label>
                <Select value={newServiceBillingCycle} onValueChange={(val: any) => setNewServiceBillingCycle(val)}>
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="semiannually">Semestral</SelectItem>
                    <SelectItem value="annually">Anual</SelectItem>
                    <SelectItem value="biennially">Bienal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status Inicial</Label>
                <Select value={newServiceStatus} onValueChange={(val: any) => setNewServiceStatus(val)}>
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Próximo Vencimento */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Próximo Vencimento</Label>
                <Input
                  type="date"
                  value={newServiceNextDue}
                  onChange={(e) => setNewServiceNextDue(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            {/* Opção de Fatura */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold cursor-pointer">Gerar Fatura Correspondente</Label>
                <p className="text-[10px] text-muted-foreground">
                  Cria a fatura financeira para cobrança deste serviço no financeiro do cliente.
                </p>
              </div>
              <Switch
                checked={newServiceInvoice}
                onCheckedChange={setNewServiceInvoice}
              />
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notas Internas (Opcional)</Label>
              <Input
                placeholder="Observações administrativas deste serviço..."
                value={newServiceNotes}
                onChange={(e) => setNewServiceNotes(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddServiceModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createServiceMutation.isPending}
                className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
              >
                {createServiceMutation.isPending ? "Cadastrando..." : "Confirmar e Criar Serviço"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 1: GERENCIAMENTO DE FATURA (Editar, Baixa, Vencimento, Abono, Cancelamento, Comentários) */}
      <Dialog open={isManageInvoiceModalOpen} onOpenChange={setIsManageInvoiceModalOpen}>
        <DialogContent className="rounded-3xl max-w-xl max-h-[90vh] overflow-y-auto">
          {managingInvoice && (
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 pr-4">
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <FileEdit className="size-5 text-brand" /> 
                    Fatura #{managingInvoice.id.slice(0, 8)}
                  </DialogTitle>
                  <Badge 
                    variant={managingInvoice.status === 'paid' ? 'default' : managingInvoice.status === 'overdue' ? 'destructive' : 'secondary'}
                    className="uppercase text-[10px]"
                  >
                    {managingInvoice.status}
                  </Badge>
                </div>
                <DialogDescription>
                  Edite vencimento, valores, observações, dê baixa manual ou abone a fatura.
                </DialogDescription>
              </DialogHeader>

              {/* BARRA DE AÇÕES RÁPIDAS */}
              <div className="p-3.5 mt-4 rounded-2xl bg-muted/40 border space-y-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Ações Administrativas Rápidas
                </span>
                <div className="flex flex-wrap gap-2">
                  {managingInvoice.status !== 'paid' && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        updateInvoiceMutation.mutate({
                          id: managingInvoice.id,
                          status: 'paid',
                          payment_method: managingInvoice.payment_method || 'manual_admin',
                          paid_at: new Date().toISOString(),
                          notes: (managingInvoice.notes ? managingInvoice.notes + '\n' : '') + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] Baixa manual efetuada pelo administrador.`,
                        });
                      }}
                      disabled={updateInvoiceMutation.isPending}
                      className="rounded-xl h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      <Check className="size-3.5" /> Dar Baixa Manual (Ativar/Renovar)
                    </Button>
                  )}

                  {managingInvoice.status !== 'paid' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        updateInvoiceMutation.mutate({
                          id: managingInvoice.id,
                          status: 'paid',
                          payment_method: 'abono_cortesia',
                          discount_amount: Number(managingInvoice.total_amount),
                          paid_at: new Date().toISOString(),
                          notes: (managingInvoice.notes ? managingInvoice.notes + '\n' : '') + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] Fatura abonada pela administração.`,
                        });
                      }}
                      disabled={updateInvoiceMutation.isPending}
                      className="rounded-xl h-8 text-xs gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 font-semibold"
                    >
                      <Gift className="size-3.5" /> Abonar Fatura (Cortesia)
                    </Button>
                  )}

                  {managingInvoice.status !== 'cancelled' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        updateInvoiceMutation.mutate({
                          id: managingInvoice.id,
                          status: 'cancelled',
                          notes: (managingInvoice.notes ? managingInvoice.notes + '\n' : '') + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] Cancelada pelo administrador.`,
                        });
                      }}
                      disabled={updateInvoiceMutation.isPending}
                      className="rounded-xl h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="size-3.5" /> Cancelar Fatura
                    </Button>
                  )}
                </div>
              </div>

              {/* FORMULÁRIO DE EDIÇÃO DETALHADA */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  updateInvoiceMutation.mutate({
                    id: managingInvoice.id,
                    status: managingInvoice.status,
                    due_date: managingInvoice.due_date,
                    total_amount: Number(managingInvoice.total_amount),
                    subtotal: Number(managingInvoice.subtotal ?? managingInvoice.total_amount),
                    discount_amount: Number(managingInvoice.discount_amount ?? 0),
                    payment_method: managingInvoice.payment_method,
                    paid_at: managingInvoice.paid_at,
                    notes: managingInvoice.notes,
                  });
                }}
                className="space-y-4 pt-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Status da Fatura</Label>
                    <Select 
                      value={managingInvoice.status} 
                      onValueChange={(val: any) => setManagingInvoice((prev: any) => ({ ...prev, status: val }))}
                    >
                      <SelectTrigger className="rounded-xl h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Paga (Paid)</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                        <SelectItem value="overdue">Vencida</SelectItem>
                        <SelectItem value="refunded">Reembolsada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Data de Vencimento</Label>
                    <Input 
                      type="date"
                      value={managingInvoice.due_date ? managingInvoice.due_date.split('T')[0] : ''}
                      onChange={(e) => setManagingInvoice((prev: any) => ({ ...prev, due_date: e.target.value }))}
                      className="rounded-xl h-10 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Valor Total (R$)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={managingInvoice.total_amount}
                      onChange={(e) => setManagingInvoice((prev: any) => ({ ...prev, total_amount: e.target.value }))}
                      className="rounded-xl h-10 font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Subtotal (R$)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={managingInvoice.subtotal ?? managingInvoice.total_amount}
                      onChange={(e) => setManagingInvoice((prev: any) => ({ ...prev, subtotal: e.target.value }))}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Desconto (R$)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={managingInvoice.discount_amount ?? 0}
                      onChange={(e) => setManagingInvoice((prev: any) => ({ ...prev, discount_amount: e.target.value }))}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Método de Pagamento</Label>
                    <Select 
                      value={managingInvoice.payment_method || 'manual'} 
                      onValueChange={(val: any) => setManagingInvoice((prev: any) => ({ ...prev, payment_method: val }))}
                    >
                      <SelectTrigger className="rounded-xl h-10 text-xs">
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                        <SelectItem value="boleto">Boleto Bancário</SelectItem>
                        <SelectItem value="ted">TED / Transferência</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                        <SelectItem value="saldo">Saldo da Carteira</SelectItem>
                        <SelectItem value="abono_cortesia">Abono / Cortesia</SelectItem>
                        <SelectItem value="manual">Manual Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Data do Pagamento</Label>
                    <Input 
                      type="date"
                      value={managingInvoice.paid_at ? managingInvoice.paid_at.split('T')[0] : ''}
                      onChange={(e) => setManagingInvoice((prev: any) => ({ 
                        ...prev, 
                        paid_at: e.target.value ? new Date(e.target.value + 'T12:00:00Z').toISOString() : null 
                      }))}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>
                </div>

                {/* ITENS DA FATURA */}
                {managingInvoice.invoice_items && managingInvoice.invoice_items.length > 0 && (
                  <div className="space-y-2 p-3 rounded-2xl bg-muted/20 border">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Itens da Fatura</Label>
                    <div className="space-y-1.5">
                      {managingInvoice.invoice_items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-none">
                          <span className="font-medium text-foreground">{item.description} (x{item.quantity || 1})</span>
                          <span className="font-mono font-bold">R$ {Number(item.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Comentários & Observações Administrativas</Label>
                  <Textarea 
                    rows={3}
                    placeholder="Adicione anotações sobre negociações, acordos, baixa manual ou motivo de abono..."
                    value={managingInvoice.notes || ''}
                    onChange={(e) => setManagingInvoice((prev: any) => ({ ...prev, notes: e.target.value }))}
                    className="rounded-xl text-xs resize-y"
                  />
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsManageInvoiceModalOpen(false)}
                    className="rounded-xl"
                  >
                    Fechar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateInvoiceMutation.isPending}
                    className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
                  >
                    {updateInvoiceMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CRIAÇÃO DE FATURA MANUAL */}
      <Dialog open={isNewInvoiceModalOpen} onOpenChange={setIsNewInvoiceModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="size-5 text-brand" /> Nova Fatura Manual
            </DialogTitle>
            <DialogDescription>
              Gere uma nova cobrança avulsa para este cliente com vencimento e valor personalizados.
            </DialogDescription>
          </DialogHeader>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const amount = parseFloat(newInvoiceAmount);
              if (isNaN(amount) || amount <= 0) {
                toast.error("Informe um valor válido.");
                return;
              }
              createManualInvoiceMutation.mutate({
                userId: clientId,
                description: newInvoiceDesc || "Serviço Avulso",
                amount,
                dueDate: newInvoiceDueDate,
                serviceId: newInvoiceServiceId !== "none" ? newInvoiceServiceId : null,
                status: newInvoiceStatus,
                paymentMethod: newInvoiceStatus === "paid" ? newInvoicePaymentMethod : null,
                notes: newInvoiceNotes || null,
              });
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição do Item / Cobrança *</Label>
              <Input 
                placeholder="Ex: Configuração de Domínio e Hospedagem"
                value={newInvoiceDesc}
                onChange={(e) => setNewInvoiceDesc(e.target.value)}
                className="rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor (R$) *</Label>
                <Input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newInvoiceAmount}
                  onChange={(e) => setNewInvoiceAmount(e.target.value)}
                  className="rounded-xl font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data de Vencimento *</Label>
                <Input 
                  type="date"
                  value={newInvoiceDueDate}
                  onChange={(e) => setNewInvoiceDueDate(e.target.value)}
                  className="rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Vincular a um Serviço Existente (Opcional)</Label>
              <Select value={newInvoiceServiceId} onValueChange={setNewInvoiceServiceId}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Selecione um serviço (opcional)..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">Nenhum (Cobrança Avulsa)</SelectItem>
                  {dossiersQuery.data?.services?.map((srv: any) => (
                    <SelectItem key={srv.id} value={srv.id}>
                      {srv.products?.name || "Serviço"} — {srv.domain || srv.username || srv.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status Inicial</Label>
                <Select value={newInvoiceStatus} onValueChange={(val: any) => setNewInvoiceStatus(val)}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Já Paga (Baixa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newInvoiceStatus === "paid" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Forma de Pagto</Label>
                  <Select value={newInvoicePaymentMethod} onValueChange={setNewInvoicePaymentMethod}>
                    <SelectTrigger className="rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="saldo">Saldo / Carteira</SelectItem>
                      <SelectItem value="manual_admin">Manual Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações / Comentário Interno</Label>
              <Textarea 
                rows={2}
                placeholder="Notas visíveis na administração..."
                value={newInvoiceNotes}
                onChange={(e) => setNewInvoiceNotes(e.target.value)}
                className="rounded-xl text-xs resize-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsNewInvoiceModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createManualInvoiceMutation.isPending}
                className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
              >
                {createManualInvoiceMutation.isPending ? "Criando..." : "Gerar Fatura"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ALTERAÇÃO DE SENHA DO CLIENTE */}
      <Dialog open={isChangePasswordModalOpen} onOpenChange={setIsChangePasswordModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-5 text-brand" /> Alterar Senha do Cliente
            </DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {client.full_name || client.email}. A alteração tem efeito imediato.
            </DialogDescription>
          </DialogHeader>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!newPasswordValue || newPasswordValue.length < 6) {
                toast.error("A senha deve ter no mínimo 6 caracteres.");
                return;
              }
              changePasswordMutation.mutate(newPasswordValue);
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Nova Senha</Label>
                <button
                  type="button"
                  onClick={() => {
                    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
                    let pass = "Eq#";
                    for (let i = 0; i < 9; i++) {
                      pass += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    setNewPasswordValue(pass);
                    setShowPasswordText(true);
                  }}
                  className="text-[10px] text-brand hover:underline font-semibold"
                >
                  Gerar Senha Forte
                </button>
              </div>

              <div className="relative">
                <Input 
                  type={showPasswordText ? "text" : "password"}
                  placeholder="Digite ou gere uma senha..."
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="rounded-xl font-mono text-sm pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswordText ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="size-3.5 shrink-0" /> Atenção:
              </p>
              <p>
                O cliente precisará desta nova senha para efetuar login imediatamente. Certifique-se de salvá-la e repassá-la ao cliente.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsChangePasswordModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={changePasswordMutation.isPending || !newPasswordValue}
                className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
              >
                {changePasswordMutation.isPending ? "Salvando..." : "Salvar Nova Senha"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: LINK DE RECUPERAÇÃO DE SENHA */}
      <Dialog open={!!resetLinkResult} onOpenChange={(open) => !open && setResetLinkResult(null)}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-500" /> Link de Recuperação Gerado
            </DialogTitle>
            <DialogDescription>
              Copie o link abaixo para enviar ao cliente através do WhatsApp ou canal de suporte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {resetLinkResult?.emailSent && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Check className="size-4 shrink-0 text-emerald-600" />
                <span>E-mail com o link de recuperação enviado para <strong>{client.email}</strong>.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Link Seguro de Redefinição</Label>
              <div className="flex gap-2">
                <Input 
                  readOnly
                  value={resetLinkResult?.link || ""}
                  className="rounded-xl font-mono text-xs bg-muted/30"
                />
                <Button 
                  type="button"
                  onClick={() => {
                    if (resetLinkResult?.link) {
                      navigator.clipboard.writeText(resetLinkResult.link);
                      toast.success("Link copiado para a área de transferência!");
                    }
                  }}
                  className="rounded-xl gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90 shrink-0"
                >
                  <Copy className="size-4" /> Copiar
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              onClick={() => setResetLinkResult(null)}
              className="rounded-xl w-full"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ProvisioningLogsTable({ clientId, serviceId }: { clientId?: string, serviceId?: string }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["provisioning-logs", clientId, serviceId],
    queryFn: async () => {
      const { getProvisioningLogs } = await import("@/lib/provisioning.functions");
      return getProvisioningLogs({ data: { clientId, serviceId } });
    }
  });

  if (isLoading) return <Skeleton className="h-40" />;

  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="size-5 text-brand" /> Auditoria de Provisionamento
        </CardTitle>
        <CardDescription>Histórico técnico de tentativas de ativação de serviços.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Tentativa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs && logs.length > 0 ? logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{log.services?.products?.name}</span>
                      <span className="text-[10px] text-muted-foreground">{log.services?.domain || "Sem domínio"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">#{log.attempt_number}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'success' ? 'default' : log.status === 'failure' ? 'destructive' : 'secondary'} className="text-[10px] uppercase">
                      {log.status === 'success' ? 'Sucesso' : log.status === 'failure' ? 'Falha' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <p className="text-[10px] font-bold text-red-500 truncate" title={log.error_message}>{log.error_code || "—"}</p>
                      <p className="text-[9px] text-muted-foreground line-clamp-1">{log.error_message || "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                      console.log("Metadata:", log.metadata);
                      toast.info("Detalhes técnicos no console");
                    }}>
                      <Link2 className="size-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                    Nenhum registro de provisionamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemLogsList({ clientId }: { clientId: string }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-client-logs", clientId],
    queryFn: async () => {
      const { getSystemLogs } = await import("@/lib/system-logs.functions");
      return getSystemLogs({ data: { actorId: clientId, limit: 50 } });
    },
  });

  if (isLoading) return <div className="p-8 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)}</div>;

  if (!logs || logs.length === 0) return <div className="p-12 text-center text-sm text-muted-foreground italic">Nenhum log de auditoria registrado para este cliente.</div>;

  return (
    <div className="divide-y divide-border/50">
      {logs.map((log: any) => (
        <div key={log.id} className={cn(
          "p-4 flex flex-col gap-1.5",
          log.level === 'critical' && "bg-red-500/[0.02]"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] uppercase font-bold">{log.category}</Badge>
              <Badge className={cn(
                "text-[9px] font-black border-none text-white",
                log.level === 'critical' ? "bg-red-600" : log.level === 'error' ? "bg-red-500" : "bg-blue-500"
              )}>
                {log.level.toUpperCase()}
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
            </span>
          </div>
          <p className="text-sm font-medium">{log.message}</p>
          {log.services && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Server className="size-3" /> {log.services.domain}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}



