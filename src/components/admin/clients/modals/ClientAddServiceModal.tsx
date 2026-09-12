import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Server, Monitor } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminCreateClientService } from "@/lib/support.functions";
import { supabase } from "@/integrations/supabase/client";

interface ClientAddServiceModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName?: string | null;
  clientEmail?: string | null;
  products?: any[];
  servers?: any[];
}

export function ClientAddServiceModal({
  isOpen,
  onOpenChange,
  clientId,
  clientName,
  clientEmail,
  products,
  servers,
}: ClientAddServiceModalProps) {
  const queryClient = useQueryClient();

  const [newServiceProduct, setNewServiceProduct] = useState("");
  const [newServiceBillingCycle, setNewServiceBillingCycle] = useState<"monthly" | "quarterly" | "semiannually" | "annually" | "biennially">("monthly");
  const [newServiceStatus, setNewServiceStatus] = useState<"active" | "pending" | "suspended" | "cancelled">("active");
  const [newServiceNextDue, setNewServiceNextDue] = useState(() => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    return nextDate.toISOString().split("T")[0] || "";
  });
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
        .select('id, external_id, ip_address, status, region, os_template, user_id');
      return (data || []).filter((i: any) => !i.user_id);
    },
    enabled: isOpen,
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: any) => adminCreateClientService({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      queryClient.invalidateQueries({ queryKey: ["admin-available-vps-instances-modal"] });
      queryClient.invalidateQueries({ queryKey: ["admin-vps-instances"] });
      onOpenChange(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl border-none p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <PlusCircle className="size-5 text-brand" /> Adicionar Serviço ao Cliente
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre um novo plano de hospedagem, servidor VPS ou outro serviço para <strong>{clientName || clientEmail}</strong>.
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
                  if (!newVpsHostname) setNewVpsHostname(`vps-${clientName?.toLowerCase().replace(/\s+/g, '') || 'instancia'}`);
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
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
  );
}
