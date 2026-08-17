import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, Receipt, Store, Ticket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createOrder } from "@/lib/finance.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/checkout/$productId")({
  head: () => ({
    meta: [
      { title: "Checkout — HostPanel" },
    ],
  }),
  component: CheckoutPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function CheckoutPage() {
  const { productId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const executeCreateOrder = useServerFn(createOrder);
  
  const [billingCycle, setBillingCycle] = useState<string>("monthly");
  const [couponCode, setCouponCode] = useState("");
  const [domain, setDomain] = useState("");

  const product = useQuery({
    queryKey: ["checkout-product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_prices(*)")
        .eq("id", productId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const orderMutation = useMutation({
    mutationFn: async () => {
      return await executeCreateOrder({
        data: {
          productId,
          billingCycle: billingCycle as any,
          couponCode: couponCode || undefined,
          domain: domain || undefined,
        }
      });
    },
    onSuccess: () => {
      toast.success("Pedido realizado com sucesso!");
      navigate({ to: "/invoices" }); // Or a specific invoice page if we had one
    },
    onError: (error: any) => {
      toast.error("Erro ao realizar pedido: " + error.message);
    }
  });

  if (product.isLoading) return <AppShell breadcrumb={<span>Checkout</span>}><Skeleton className="h-96 rounded-3xl" /></AppShell>;
  if (!product.data) return <AppShell breadcrumb={<span>Checkout</span>}>Produto não encontrado</AppShell>;

  const currentPrice = product.data.product_prices?.find((p) => p.cycle === billingCycle);

  return (
    <AppShell
      area="client"
      breadcrumb={
        <>
          <span className="flex items-center gap-2">
            <Store className="size-4" />
            Loja
          </span>
          <span>/</span>
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Receipt className="size-4" />
            Checkout
          </span>
        </>
      }
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Check className="size-5 text-brand" />
              1. Configuração do serviço
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Ciclo de faturamento</label>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {product.data.product_prices?.map((p) => (
                    <button
                      key={p.cycle}
                      onClick={() => setBillingCycle(p.cycle)}
                      className={cn(
                        "rounded-xl border p-3 text-sm transition-all",
                        billingCycle === p.cycle
                          ? "border-brand bg-brand/5 ring-1 ring-brand"
                          : "border-border hover:border-brand/50"
                      )}
                    >
                      <p className="font-semibold uppercase text-[10px] text-muted-foreground">{p.cycle}</p>
                      <p className="mt-1 font-bold">{brl.format(Number(p.price))}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Domínio (opcional)</label>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="exemplo.com.br"
                  className="mt-2 h-11 rounded-xl"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Ticket className="size-5 text-brand" />
              2. Cupom de desconto
            </h2>
            <div className="mt-4 flex gap-2">
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Código do cupom"
                className="h-11 rounded-xl"
              />
              <Button variant="outline" className="h-11 rounded-xl">Aplicar</Button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-sidebar p-6 sticky top-6">
            <h2 className="text-lg font-semibold">Resumo do pedido</h2>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{product.data.name}</span>
                <span className="font-medium">{brl.format(Number(currentPrice?.price ?? 0))}</span>
              </div>
              <div className="border-t border-sidebar-border pt-3 flex justify-between font-bold">
                <span>Total hoje</span>
                <span className="text-brand">{brl.format(Number(currentPrice?.price ?? 0))}</span>
              </div>
            </div>
            <Button 
              className="mt-6 w-full h-12 rounded-xl text-lg font-semibold"
              onClick={() => orderMutation.mutate()}
              disabled={orderMutation.isPending}
            >
              {orderMutation.isPending ? "Processando..." : "Confirmar pedido"}
            </Button>
            <p className="mt-4 text-[10px] text-center text-muted-foreground">
              Ao confirmar o pedido, você concorda com nossos Termos de Serviço.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
