import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminCreateManualInvoice } from "@/lib/finance.functions";

interface ClientNewInvoiceModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  services?: any[];
}

export function ClientNewInvoiceModal({
  isOpen,
  onOpenChange,
  clientId,
  services,
}: ClientNewInvoiceModalProps) {
  const queryClient = useQueryClient();

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

  const executeCreateManualInvoice = useServerFn(adminCreateManualInvoice);
  const createManualInvoiceMutation = useMutation({
    mutationFn: (data: any) => executeCreateManualInvoice({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier", clientId] });
      onOpenChange(false);
      setNewInvoiceDesc("");
      setNewInvoiceAmount("");
      setNewInvoiceNotes("");
      toast.success("Fatura manual criada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao criar fatura: " + err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="size-5 text-brand" /> Nova Fatura Manual
          </DialogTitle>
          <DialogDescription>
            Gere uma nova cobrança avulsa para este cliente com vencimento e valor personalizados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
                {services?.map((srv: any) => (
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
              onClick={() => onOpenChange(false)}
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
  );
}
