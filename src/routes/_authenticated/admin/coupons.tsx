import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Store, Ticket } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({
    meta: [
      { title: "Cupons de Desconto — HostPanel" },
      {
        name: "description",
        content: "Gerencie cupons e promoções para seus clientes.",
      },
    ],
  }),
  component: AdminCouponsPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function AdminCouponsPage() {
  const [term, setTerm] = useState("");

  const coupons = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (coupons.data ?? []).filter((c) =>
    c.code.toLowerCase().includes(term.trim().toLowerCase()),
  );

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
            <Ticket className="size-4" />
            Cupons
          </span>
        </>
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight">Cupons de desconto</h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar código"
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <Button className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1 size-4" />
          Novo Cupom
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {coupons.isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            Nenhum cupom encontrado
          </div>
        ) : (
          filtered.map((coupon) => (
            <div key={coupon.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg text-brand uppercase">{coupon.code}</h3>
                  <p className="text-xs text-muted-foreground">
                    {coupon.type === 'percentage' ? `${coupon.value}% de desconto` : `${brl.format(Number(coupon.value))} de desconto`}
                  </p>
                </div>
                <Badge variant={coupon.is_active ? "default" : "secondary"}>
                  {coupon.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                <span>Usos: {coupon.used_count || 0}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}</span>
                {coupon.valid_until && (
                  <span>Validade: {new Date(coupon.valid_until).toLocaleDateString("pt-BR")}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
