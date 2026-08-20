import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
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
} from "lucide-react";

import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { impersonateClient, updateClientProfile } from "@/lib/admin.functions";
import { logSessionEvent } from "@/lib/audit.functions";


import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getServers, updateServiceDetails, getAllProducts } from "@/lib/support.functions";
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
    staleTime: 1000 * 60 * 2,
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

  const { data: client } = useSuspenseQuery(clientDossierQueryOptions(clientId));
  const { data: servers } = useSuspenseQuery(serversQueryOptions);
  const { data: allProducts } = useSuspenseQuery(productsQueryOptions);

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData.entries()) as Record<string, string>;

    // O e-mail é gerenciado pela autenticação e o ID nunca deve ser alterado
    const { email, id, ...values } = raw;
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
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.full_name || "Sem Nome"}</h1>
            <p className="text-muted-foreground">{client.email}</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="rounded-xl flex gap-2 h-10"
              onClick={handleImpersonate}
              disabled={isImpersonating}
            >
              <LogIn className="size-4" /> 
              {isImpersonating ? "Acessando..." : "Acessar como Cliente"}
            </Button>
            <Badge className="h-10 px-4 text-sm" variant={client.status === "active" ? "default" : "secondary"}>
              {client.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
          </div>

        </div>

        <Tabs defaultValue="info" className="w-full">
          <div className="overflow-x-auto pb-2">
            <TabsList className="bg-muted/50 p-1 rounded-2xl h-12 w-max min-w-full justify-start sm:w-auto">
              <TabsTrigger value="info" className="rounded-xl flex gap-2"><User className="size-4" /> Dados</TabsTrigger>
              <TabsTrigger value="services" className="rounded-xl flex gap-2"><Server className="size-4" /> Serviços</TabsTrigger>
              <TabsTrigger value="finance" className="rounded-xl flex gap-2"><CreditCard className="size-4" /> Financeiro</TabsTrigger>
              <TabsTrigger value="emails" className="rounded-xl flex gap-2"><Mail className="size-4" /> E-mails</TabsTrigger>
              <TabsTrigger value="tickets" className="rounded-xl flex gap-2"><LifeBuoy className="size-4" /> Tickets</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="info" className="mt-6">
            <Card className="rounded-3xl border-none bg-card shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Informações do Cliente</CardTitle>
                  <CardDescription>Dados pessoais e de contato</CardDescription>
                </div>
                {!isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(true)} className="rounded-xl">
                    Editar Dados
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <form 
                  onSubmit={handleSubmit} 
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input id="full_name" name="full_name" defaultValue={client.full_name || ""} disabled={!isEditing} className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" defaultValue={client.email || ""} disabled={true} className="rounded-xl h-11 bg-muted/30" />
                    <p className="text-[10px] text-muted-foreground">O e-mail é gerenciado via autenticação e não pode ser alterado aqui.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Empresa</Label>
                    <Input id="company_name" name="company_name" defaultValue={client.company_name || ""} disabled={!isEditing} className="rounded-xl h-11" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="col-span-full border-t pt-4">

                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader>
                <CardTitle>Serviços Contratados</CardTitle>
                <CardDescription>Hospedagem, domínios e outros</CardDescription>
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
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{s.products?.name || "Produto"}</span>
                                {s.username ? (
                                  <span className="text-[10px] text-muted-foreground">Usuário: {s.username}</span>
                                ) : (
                                  <span className="text-[10px] text-destructive italic">Usuário ausente</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {s.domain || "—"}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {s.server_id || s.servers ? (
                                <span className="text-xs">
                                  {(s.servers?.hostname || servers?.find(sv => sv.id === s.server_id)?.hostname) || "Servidor"}
                                </span>
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
                            <TableCell className="hidden md:table-cell">
                              {s.next_due_date ? format(new Date(s.next_due_date), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={s.status === 'active' ? 'default' : s.status === 'suspended' ? 'secondary' : 'destructive'}>
                                {s.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {s.status === 'active' && s.username && s.server_id && (
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

          <TabsContent value="finance" className="mt-6">
            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader>
                <CardTitle>Histórico Financeiro</CardTitle>
                <CardDescription>Faturas pagas e pendentes</CardDescription>
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
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {dossiersQuery.data?.invoices.map((inv: any) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">#{inv.id.slice(0, 8)}</TableCell>
                          <TableCell>R$ {inv.total_amount.toFixed(2)}</TableCell>
                          <TableCell>
                            {format(new Date(inv.due_date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {inv.paid_at ? format(new Date(inv.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>
                              {inv.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {dossiersQuery.data?.invoices.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhuma fatura encontrada</TableCell>
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
        </Tabs>
      </div>

      <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
        <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Gerenciar Serviço</DialogTitle>
            <DialogDescription>
              Ajuste manualmente os detalhes técnicos para sincronização com o servidor.
            </DialogDescription>
          </DialogHeader>
          {editingService && (
            <form onSubmit={handleUpdateService} className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="product_id">Produto / Plano</Label>
                <Select 
                  name="product_id" 
                  defaultValue={editingService.product_id || ""}
                >
                  <SelectTrigger id="product_id" className="h-11 rounded-xl border-input bg-background shadow-sm">
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
              <div className="grid gap-2">
                <Label htmlFor="username">Usuário do Servidor (SSO)</Label>
                <Input 
                  id="username" 
                  name="username" 
                  defaultValue={editingService.username || ""} 
                  placeholder="Ex: abacap123" 
                  className="rounded-xl h-11" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="domain">Domínio</Label>
                <Input 
                  id="domain" 
                  name="domain" 
                  defaultValue={editingService.domain || ""} 
                  placeholder="dominio.com.br" 
                  className="rounded-xl h-11" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="next_due_date">Data de Vencimento</Label>
                <Input 
                  type="date"
                  id="next_due_date" 
                  name="next_due_date" 
                  defaultValue={editingService.next_due_date ? editingService.next_due_date.split('T')[0] : ""} 
                  className="rounded-xl h-11" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="server_id">Servidor Vinculado</Label>
                <Select 
                  name="server_id" 
                  defaultValue={editingService.server_id || ""}
                >
                  <SelectTrigger id="server_id" className="h-11 rounded-xl border-input bg-background shadow-sm">
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
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  name="status" 
                  defaultValue={editingService.status}
                >
                  <SelectTrigger id="status" className="h-11 rounded-xl border-input bg-background shadow-sm">
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
              <DialogFooter className="pt-4">
                <Button 
                  type="submit" 
                  disabled={updateServiceMutation.isPending} 
                  className="bg-brand text-brand-foreground w-full rounded-2xl h-12"
                >
                  {updateServiceMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

