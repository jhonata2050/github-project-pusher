import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Receipt, Search, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/app/AppShell";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { adminUpdateInvoice } from "@/lib/finance.functions";
import {
  InvoicesTable,
  InvoiceManageModal,
  type AdminInvoiceRecord,
} from "@/components/admin/invoices";

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

function AdminInvoicesPage() {
  const [term, setTerm] = useState("");
  const [managingInvoice, setManagingInvoice] = useState<AdminInvoiceRecord | null>(null);
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
          })) as AdminInvoiceRecord[];
        }
      }
      return (data || []) as AdminInvoiceRecord[];
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

  const filtered = (invoices.data ?? []).filter((inv: AdminInvoiceRecord) => {
    const name = inv.profiles?.full_name?.toLowerCase() ?? "";
    const email = inv.profiles?.email?.toLowerCase() ?? "";
    const search = term.trim().toLowerCase();
    return name.includes(search) || email.includes(search) || inv.id.includes(search);
  });

  const handleOpenManage = (inv: AdminInvoiceRecord) => {
    setManagingInvoice({ ...inv });
    setIsManageModalOpen(true);
  };

  const handleQuickPay = () => {
    if (!managingInvoice) return;
    updateInvoiceMutation.mutate({
      id: managingInvoice.id,
      status: 'paid',
      payment_method: managingInvoice.payment_method || 'manual_admin',
      paid_at: new Date().toISOString(),
      notes: (managingInvoice.notes ? managingInvoice.notes + '\n' : '') + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] Baixa manual efetuada pelo administrador.`,
    });
  };

  const handleQuickWaive = () => {
    if (!managingInvoice) return;
    updateInvoiceMutation.mutate({
      id: managingInvoice.id,
      status: 'paid',
      payment_method: 'abono_cortesia',
      discount_amount: Number(managingInvoice.total_amount),
      paid_at: new Date().toISOString(),
      notes: (managingInvoice.notes ? managingInvoice.notes + '\n' : '') + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] Fatura abonada pela administração.`,
    });
  };

  const handleQuickCancel = () => {
    if (!managingInvoice) return;
    updateInvoiceMutation.mutate({
      id: managingInvoice.id,
      status: 'cancelled',
      notes: (managingInvoice.notes ? managingInvoice.notes + '\n' : '') + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] Cancelada pelo administrador.`,
    });
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingInvoice) return;
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
  };

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

      <InvoicesTable
        invoices={filtered}
        isLoading={invoices.isLoading}
        onManage={handleOpenManage}
      />

      <InvoiceManageModal
        isOpen={isManageModalOpen}
        onOpenChange={setIsManageModalOpen}
        managingInvoice={managingInvoice}
        setManagingInvoice={setManagingInvoice}
        onQuickPay={handleQuickPay}
        onQuickWaive={handleQuickWaive}
        onQuickCancel={handleQuickCancel}
        onSubmitEdit={handleSubmitEdit}
        isPending={updateInvoiceMutation.isPending}
      />
    </AppShell>
  );
}
