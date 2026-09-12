import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Receipt, Search, Store, FileEdit, Check, Gift, XCircle, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { adminUpdateInvoice } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  head: () => ({
    meta: [
      { title: "Faturas — Eqsam" },
      {
        name: "description",
        content: "Gerencie todas as faturas e cobranças dos seus clientes.",
      },
    ],
  }),
  component: AdminInvoicesPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" },
  paid: { label: "Paga", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground border border-border" },
  refunded: { label: "Estornada", color: "bg-destructive/10 text-destructive border border-destructive/20" },
  overdue: { label: "Atrasada", color: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" },
};

function AdminInvoicesPage() {
  const [term, setTerm] = useState("");
  const [managingInvoice, setManagingInvoice] = useState<any>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const invoices = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id, 
          user_id,
          status, 
          total_amount, 
          subtotal,
          discount_amount,
          due_date, 
          paid_at,
          payment_method,
          notes,
          created_at,
          invoice_items (id, description, amount, quantity)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = Array.from(new Set(data.map((inv: any) => inv.user_id).filter(Boolean)));
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);
          const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));
          return data.map((inv: any) => ({
            ...inv,
            profiles: pMap.get(inv.user_id) || null
          }));
        }
      }
      return data || [];
    },
  });

  const executeUpdateInvoice = useServerFn(adminUpdateInvoice);
  const updateInvoiceMutation = useMutation({
    mutationFn: (data: any) => executeUpdateInvoice({ data }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-client-dossier"] });
      setIsManageModalOpen(false);
      setManagingInvoice(null);
      if (res?.provisioningTriggered) {
        toast.success("Fatura baixada com sucesso! Provisionamento acionado.");
      } else {
        toast.success("Fatura atualizada com sucesso!");
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar fatura: " + err.message);
    }
  });

  const filtered = (invoices.data ?? []).filter((inv: any) => {
    const name = inv.profiles?.full_name?.toLowerCase() ?? "";
    const email = inv.profiles?.email?.toLowerCase() ?? "";
    const search = term.trim().toLowerCase();
    return name.includes(search) || email.includes(search) || inv.id.includes(search);
  });

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <>
          <span className="flex items-center gap-2">
            <Store className="size-4" />
            Sua Loja
          </span>
          <span>/</span>
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Receipt className="size-4" />
            Faturas
          </span>
        </>
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight">Todas as faturas</h1>

      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar por nome, e-mail ou ID"
            className="h-11 rounded-xl pl-9"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Fatura</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.isLoading ? (
                [0, 1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhuma fatura encontrada
                  </td>
                </tr>
              ) : (
                filtered.map((inv: any) => {
                  const status = STATUS_LABELS[inv.status] || { label: inv.status, color: "bg-muted text-muted-foreground" };
                  return (
                    <tr key={inv.id} className="hover:bg-sidebar-accent/50 transition-colors">
                      <td className="px-4 py-4 font-medium">
                        <div className="flex flex-col">
                          <span className="font-bold">#{inv.id.slice(0, 8)}</span>
                          {inv.notes && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={inv.notes}>
                              {inv.notes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          {inv.user_id ? (
                            <Link 
                              to="/admin/clients/$clientId" 
                              params={{ clientId: inv.user_id }}
                              className="font-medium text-brand hover:underline flex items-center gap-1"
                            >
                              <User className="size-3" />
                              {inv.profiles?.full_name || "Cliente"}
                            </Link>
                          ) : (
                            <span className="font-medium text-foreground">{inv.profiles?.full_name || "—"}</span>
                          )}
                          <span className="text-xs text-muted-foreground">{inv.profiles?.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-4 font-semibold text-foreground">
                        <span>{brl.format(Number(inv.total_amount))}</span>
                        {Number(inv.discount_amount) > 0 && (
                          <span className="text-[10px] text-emerald-600 block">
                            Desc: {brl.format(Number(inv.discount_amount))}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs capitalize text-muted-foreground">
                        {inv.payment_method || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={cn("rounded-full px-3 py-0.5 text-[11px] font-bold uppercase", status.color)}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl h-8 text-xs gap-1.5 border-brand/40 text-brand hover:bg-brand/10 font-semibold"
                          onClick={() => {
                            setManagingInvoice({ ...inv });
                            setIsManageModalOpen(true);
                          }}
                        >
                          <FileEdit className="size-3.5" /> Gerenciar
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE GERENCIAMENTO DE FATURA */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
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
                  Cliente: <strong>{managingInvoice.profiles?.full_name || managingInvoice.profiles?.email || "Cliente"}</strong>
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
                    onClick={() => setIsManageModalOpen(false)}
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
    </AppShell>
  );
}
