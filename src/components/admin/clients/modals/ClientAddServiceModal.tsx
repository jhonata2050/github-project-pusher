import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminCreateClientService } from "@/lib/support.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  HostingFieldsSection,
  VpsFieldsSection,
  BillingFieldsSection,
  type ClientAddServiceModalProps,
} from "./add-service";

export { type ClientAddServiceModalProps };

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

  const selectedProd = products?.find((p: any) => p.id === newServiceProduct);
  const isHosting = !selectedProd || selectedProd.product_type === 'hosting';
  const isVPS = selectedProd?.product_type === 'vps';

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

          {/* Seção Hospedagem */}
          {isHosting && (
            <HostingFieldsSection
              newServiceDomain={newServiceDomain}
              setNewServiceDomain={setNewServiceDomain}
              newServiceServer={newServiceServer}
              setNewServiceServer={setNewServiceServer}
              newServiceUsername={newServiceUsername}
              setNewServiceUsername={setNewServiceUsername}
              newServicePassword={newServicePassword}
              setNewServicePassword={setNewServicePassword}
              newServiceProvision={newServiceProvision}
              setNewServiceProvision={setNewServiceProvision}
              servers={servers}
            />
          )}

          {/* Seção VPS */}
          {isVPS && (
            <VpsFieldsSection
              availableVpsInstances={availableVpsInstances}
              newVpsInstanceId={newVpsInstanceId}
              setNewVpsInstanceId={setNewVpsInstanceId}
              newVpsHostname={newVpsHostname}
              setNewVpsHostname={setNewVpsHostname}
              newVpsIpAddress={newVpsIpAddress}
              setNewVpsIpAddress={setNewVpsIpAddress}
              newVpsExternalId={newVpsExternalId}
              setNewVpsExternalId={setNewVpsExternalId}
              newVpsOsTemplate={newVpsOsTemplate}
              setNewVpsOsTemplate={setNewVpsOsTemplate}
              newVpsRegion={newVpsRegion}
              setNewVpsRegion={setNewVpsRegion}
              newVpsSshUser={newVpsSshUser}
              setNewVpsSshUser={setNewVpsSshUser}
              newVpsSshPort={newVpsSshPort}
              setNewVpsSshPort={setNewVpsSshPort}
              newVpsSshPassword={newVpsSshPassword}
              setNewVpsSshPassword={setNewVpsSshPassword}
            />
          )}

          {/* Seção Faturamento */}
          <BillingFieldsSection
            newServiceBillingCycle={newServiceBillingCycle}
            setNewServiceBillingCycle={setNewServiceBillingCycle}
            newServiceStatus={newServiceStatus}
            setNewServiceStatus={setNewServiceStatus}
            newServiceNextDue={newServiceNextDue}
            setNewServiceNextDue={setNewServiceNextDue}
            newServiceInvoice={newServiceInvoice}
            setNewServiceInvoice={setNewServiceInvoice}
            newServiceNotes={newServiceNotes}
            setNewServiceNotes={setNewServiceNotes}
          />

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
