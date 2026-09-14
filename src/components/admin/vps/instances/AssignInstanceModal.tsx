import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssignInstanceModalProps } from "./types";

export function AssignInstanceModal({
  isOpen,
  selectedInstance,
  clients,
  clientServices,
  selectedClientId,
  selectedServiceId,
  isAssignPending,
  onOpenChange,
  onClientChange,
  onServiceChange,
  onConfirmAssign,
}: AssignInstanceModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-none">
        <DialogHeader>
          <DialogTitle>Vincular Servidor a Cliente</DialogTitle>
          <CardDescription>
            Selecione o cliente e o serviço correspondente para vincular a instância{" "}
            <strong>{selectedInstance?.displayName || selectedInstance?.name}</strong>.
          </CardDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Selecionar Cliente</Label>
            <Select onValueChange={onClientChange} value={selectedClientId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Escolha um cliente..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name || "Cliente"} ({client.email || "Sem e-mail"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClientId && (
            <div className="space-y-2">
              <Label>Selecionar Serviço Ativo</Label>
              <Select onValueChange={onServiceChange} value={selectedServiceId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Escolha o serviço..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {clientServices?.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-2">
                        Nenhum serviço VPS encontrado para este cliente.
                      </p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        asChild
                        className="text-brand h-auto p-0"
                      >
                        <a href="/admin/clients" target="_blank" rel="noreferrer">
                          Criar pedido manual para o cliente
                        </a>
                      </Button>
                    </div>
                  ) : (
                    clientServices?.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.products?.name} - {service.domain || "Serviço"} ({service.status})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button 
            onClick={onConfirmAssign}
            disabled={!selectedServiceId || isAssignPending}
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {isAssignPending ? "Vinculando..." : "Confirmar Vinculação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
