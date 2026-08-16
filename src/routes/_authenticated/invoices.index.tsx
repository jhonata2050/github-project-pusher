import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Receipt, Search, Store } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";


export const Route = createFileRoute("/_authenticated/invoices/")({
  head: () => ({
    meta: [
      { title: "Minhas Faturas — HostPanel" },
      {
        name: "description",
        content: "Visualize e pague suas faturas de hospedagem.",
      },
    ],
  }),
  component: ClientInvoicesPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-warning text-warning-foreground" },
  paid: { label: "Paga", color: "bg-success text-success-foreground" },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground" },
  refunded: { label: "Estornada", color: "bg-destructive text-destructive-foreground" },
  overdue: { label: "Atrasada", color: "bg-destructive text-destructive-foreground" },
};

function ClientInvoicesPage() {
  const [term, setTerm] = useState("");
  const { user, impersonatedClientId } = useAuth();
  const effectiveUserId = impersonatedClientId || user?.id;

  const invoices = useQuery({
    queryKey: ["client-invoices", effectiveUserId],
    enabled: Boolean(effectiveUserId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id, 
          status, 
          total_amount, 
          due_date, 
          created_at
        `)
        .eq("user_id", effectiveUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });


  const filtered = (invoices.data ?? []).filter((inv: any) => {
    const search = term.trim().toLowerCase();
    return inv.id.includes(search);
  });

  return (
    <AppShell
      area="client"
      breadcrumb={
        <>
          <span className="flex items-center gap-2">
            <Store className="size-4" />
            Minha conta
          </span>
          <span>/</span>
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Receipt className="size-4" />
            Minhas faturas
          </span>
        </>
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight">Minhas faturas</h1>

      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar por ID"
            className="h-11 rounded-xl pl-9"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {invoices.isLoading ? (
          [0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
            Nenhuma fatura encontrada
          </div>
        ) : (
          filtered.map((inv: any) => {
            const status = STATUS_LABELS[inv.status] || { label: inv.status, color: "bg-muted" };
            return (
              <div key={inv.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-4">
                  <div className={cn("flex size-10 items-center justify-center rounded-full shrink-0", inv.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                    <Receipt className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Fatura #{inv.id.slice(0, 8)}</h3>
                    <p className="text-xs text-muted-foreground">Vencimento: {new Date(inv.due_date).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                
                <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-6">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-foreground">{brl.format(Number(inv.total_amount))}</p>
                    <Badge className={cn("mt-1 rounded-full border-none px-3 text-[10px] font-bold uppercase", status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                  <Link to="/invoices/$invoiceId" params={{ invoiceId: inv.id }}>
                    <Button variant={inv.status === 'paid' ? "outline" : "default"} size="sm" className="rounded-xl h-9">
                      {inv.status === 'paid' ? "Ver recibo" : "Pagar agora"}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
