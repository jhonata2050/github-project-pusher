import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Monitor, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VPSInstanceSelector } from "../VPSInstanceSelector";
import { updateServiceDetails, hostingAction } from "@/lib/support.functions";
import { useServerFn } from "@tanstack/react-start";

interface ClientEditServiceModalProps {
  editingService: any;
  setEditingService: (service: any) => void;
  servers?: any[];
  allProducts?: any[];
  clientId: string;
}

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
    }
  });

  const executeHostingAction = useServerFn(hostingAction);
  const hostingActionMutation = useMutation({
    mutationFn: (vars: { serviceId: string; action: 'suspend' | 'unsuspend' | 'delete' }) => {
      return executeHostingAction({ data: vars });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      toast.success(`Ação ${vars.action} executada com sucesso`);
    },
    onError: (err: any) => {
      toast.error(`Erro ao executar ação: ${err.message}`);
    }
  });

  const handleUpdateService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingService) return;
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
  );
}
