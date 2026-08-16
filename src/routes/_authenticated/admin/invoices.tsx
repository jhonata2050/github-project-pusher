import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Receipt, Search, Store } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  head: () => ({
    meta: [
      { title: "Faturas — HostPanel" },
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
  pending: { label: "Pendente", color: "bg-warning text-warning-foreground" },
  paid: { label: "Paga", color: "bg-success text-success-foreground" },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground" },
  refunded: { label: "Estornada", color: "bg-destructive text-destructive-foreground" },
  overdue: { label: "Atrasada", color: "bg-destructive text-destructive-foreground" },
};

function AdminInvoicesPage() {
  const [term, setTerm] = useState("");

  const invoices = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id, 
          status, 
          total_amount, 
          due_date, 
          created_at,
          profiles:user_id (full_name, email)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
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
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.isLoading ? (
                [0, 1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhuma fatura encontrada
                  </td>
                </tr>
              ) : (
                filtered.map((inv: any) => {
                  const status = STATUS_LABELS[inv.status] || { label: inv.status, color: "bg-muted" };
                  return (
                    <tr key={inv.id} className="hover:bg-sidebar-accent/50">
                      <td className="px-4 py-4 font-medium">#{inv.id.slice(0, 8)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{inv.profiles?.full_name}</span>
                          <span className="text-xs text-muted-foreground">{inv.profiles?.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-4 font-semibold text-foreground">
                        {brl.format(Number(inv.total_amount))}
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={cn("rounded-full border-none px-3 font-medium", status.color)}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button className="text-brand hover:underline font-medium">Ver detalhes</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
