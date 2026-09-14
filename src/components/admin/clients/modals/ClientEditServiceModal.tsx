import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateServiceDetails, hostingAction } from "@/lib/support.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  ClientEditServiceModalProps,
  ServiceVpsOrHostingFields,
  ServiceDirectAdminBlock,
  ServiceActionButtons,
} from "./service/index";

export function ClientEditServiceModal({
  editingService,
  setEditingService,
  servers,
  allProducts,
  clientId,
}: ClientEditServiceModalProps) {
  const queryClient = useQueryClient();

  const updateServiceMutation = useMutation({
    mutationFn: (data: any) => updateServiceDetails({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      setEditingService(null);
      toast.success("Serviço atualizado com sucesso");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar serviço: " + err.message);
    },
  });

  const executeHostingAction = useServerFn(hostingAction);
  const hostingActionMutation = useMutation({
    mutationFn: (vars: { serviceId: string; action: "suspend" | "unsuspend" | "delete" }) => {
      return executeHostingAction({ data: vars });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      toast.success(`Ação ${vars.action} executada com sucesso`);
    },
    onError: (err: any) => {
      toast.error(`Erro ao executar ação: ${err.message}`);
    },
  });

  const handleUpdateService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingService) return;
    const formData = new FormData(e.currentTarget);
    updateServiceMutation.mutate({
      serviceId: editingService.id,
      username: (formData.get("username") as string) || null,
      domain: (formData.get("domain") as string) || null,
      server_id: (formData.get("server_id") as string) || null,
      product_id: (formData.get("product_id") as string) || null,
      next_due_date: (formData.get("next_due_date") as string) || null,
      status: (formData.get("status") as any) || null,
      block_directadmin: formData.get("block_directadmin_service") === "true",
      password: (formData.get("da_password") as string) || null,
      vps_instance_id: (formData.get("vps_instance_id") as string) || null,
    });
  };

  return (
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
              <Select name="product_id" defaultValue={editingService.product_id || ""}>
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

            <ServiceVpsOrHostingFields editingService={editingService} servers={servers} />

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
                defaultValue={editingService.next_due_date ? editingService.next_due_date.split("T")[0] : ""}
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status" className="text-xs">Status</Label>
              <Select name="status" defaultValue={editingService.status}>
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

            <ServiceDirectAdminBlock
              editingService={editingService}
              setEditingService={setEditingService}
            />

            <ServiceActionButtons
              editingService={editingService}
              hostingActionMutation={hostingActionMutation}
              isSaving={updateServiceMutation.isPending}
            />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
