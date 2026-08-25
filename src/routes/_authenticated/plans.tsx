import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  Box, 
  Check, 
  Cpu, 
  HardDrive, 
  Layers, 
  Monitor, 
  Rocket, 
  Server, 
  ShieldCheck, 
  Sparkles, 
  Zap 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

type PlansSearchParams = {
  tab?: string;
};

export const Route = createFileRoute("/_authenticated/plans")({
  validateSearch: (search: Record<string, unknown>): PlansSearchParams => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Contratar Planos — Eqsam" },
      { name: "description", content: "Escolha o melhor plano para hospedar suas aplicações, bots e servidores." },
    ],
  }),
  component: PlansPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function PlansPage() {
  const search = Route.useSearch();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");
  const [activeTab, setActiveTab] = useState<string>("");

  const groupsQuery = useQuery({
    queryKey: ["authenticated-plans-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_groups")
        .select(`
          id,
          name,
          description,
          sort_order,
          products (
            id,
            name,
            description,
            disk_quota_mb,
            bandwidth_quota_mb,
            domains_limit,
            email_accounts_limit,
            is_featured,
            sort_order,
            is_visible,
            product_prices (
              cycle,
              price,
              is_active
            )
          )
        `)
        .eq("is_visible", true)
        .order("sort_order");

      if (error) throw error;

      return (data ?? [])
        .map((group) => ({
          ...group,
          products: ((group.products as any[]) || [])
            .filter((p) => p.is_visible)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        }))
        .filter((group) => group.products.length > 0);
    },
  });

  const groups = groupsQuery.data ?? [];

  useEffect(() => {
    if (groups.length > 0 && !activeTab) {
      if (search.tab === "paas" || search.tab === "apps") {
        const paasGroup = groups.find(
          (g) =>
            g.name.toLowerCase().includes("paas") ||
            g.name.toLowerCase().includes("aplicações") ||
            g.name.toLowerCase().includes("bots")
        );
        if (paasGroup) {
          setActiveTab(paasGroup.id);
          return;
        }
      } else if (search.tab === "vps") {
        const vpsGroup = groups.find((g) => g.name.toLowerCase().includes("vps"));
        if (vpsGroup) {
          setActiveTab(vpsGroup.id);
          return;
        }
      }
      setActiveTab(groups[0]?.id || "");
    }
  }, [groups, search.tab, activeTab]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Catálogo de Recursos
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Contratar Planos & Recursos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Escolha o plano ideal para rodar seus containers, bots, APIs ou servidores com deploy instantâneo.
          </p>
        </div>

        {/* Ciclo de Pagamento */}
        <div className="flex items-center bg-muted/60 p-1.5 rounded-2xl border">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              billingCycle === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annually")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === "annually"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Anual
            <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-md font-extrabold">
              Economize
            </span>
          </button>
        </div>
      </div>

      {groupsQuery.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-3xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="rounded-3xl p-12 text-center border-dashed">
          <Box className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold">Nenhum plano disponível no momento</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Novos recursos e planos serão disponibilizados em breve.
          </p>
        </Card>
      ) : (
        <Tabs value={activeTab || groups[0]?.id} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto flex-wrap justify-start gap-1.5 border">
            {groups.map((group) => {
              const isPaaS =
                group.name.toLowerCase().includes("paas") ||
                group.name.toLowerCase().includes("aplicações") ||
                group.name.toLowerCase().includes("bots");

              const isVPS = group.name.toLowerCase().includes("vps");

              return (
                <TabsTrigger
                  key={group.id}
                  value={group.id}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer"
                >
                  {isPaaS ? (
                    <Rocket className="h-3.5 w-3.5 mr-2 text-primary" />
                  ) : isVPS ? (
                    <Monitor className="h-3.5 w-3.5 mr-2 text-primary" />
                  ) : (
                    <Server className="h-3.5 w-3.5 mr-2 text-primary" />
                  )}
                  <span>{group.name}</span>
                  <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-mono text-muted-foreground">
                    {group.products.length}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {groups.map((group) => (
            <TabsContent key={group.id} value={group.id} className="space-y-6">
              {group.description && (
                <div className="bg-muted/30 border p-4 rounded-2xl">
                  <p className="text-xs text-muted-foreground">
                    {group.description}
                  </p>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {group.products.map((prod) => {
                  const priceObj =
                    prod.product_prices.find(
                      (p: any) => p.cycle === billingCycle && p.is_active
                    ) ||
                    prod.product_prices.find((p: any) => p.is_active) ||
                    prod.product_prices[0];

                  const priceVal = priceObj ? priceObj.price : 0;
                  const cycleLabel =
                    priceObj?.cycle === "annually"
                      ? "/ano"
                      : priceObj?.cycle === "quarterly"
                      ? "/trimestre"
                      : "/mês";

                  const isPaaS =
                    group.name.toLowerCase().includes("paas") ||
                    group.name.toLowerCase().includes("aplicações") ||
                    prod.name.includes("MB") ||
                    prod.name.includes("GB");

                  return (
                    <Card
                      key={prod.id}
                      className={`rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden bg-card hover:shadow-xl ${
                        prod.is_featured
                          ? "border-primary shadow-md ring-2 ring-primary/20"
                          : "hover:border-primary/50 shadow-xs"
                      }`}
                    >
                      {prod.is_featured && (
                        <div className="absolute top-0 right-0">
                          <span className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
                            Popular
                          </span>
                        </div>
                      )}

                      <CardHeader className="p-6 pb-4">
                        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3.5 border border-primary/20">
                          {isPaaS ? (
                            <Zap className="h-5 w-5 fill-primary/30" />
                          ) : (
                            <Server className="h-5 w-5" />
                          )}
                        </div>

                        <CardTitle className="text-base font-bold leading-snug">
                          {prod.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground min-h-[2.5rem] mt-1.5 leading-relaxed line-clamp-2">
                          {prod.description || "Recursos de computação com alta disponibilidade e isolamento total."}
                        </CardDescription>

                        <div className="mt-4 pt-4 border-t flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                            {brl.format(priceVal)}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {cycleLabel}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6 pt-0 space-y-3 mt-auto">
                        <div className="space-y-2 text-xs text-muted-foreground border-t pt-3 font-medium">
                          {prod.disk_quota_mb > 0 && (
                            <div className="flex items-center gap-2">
                              <HardDrive className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>
                                {prod.disk_quota_mb >= 1024
                                  ? `${(prod.disk_quota_mb / 1024).toFixed(0)} GB SSD NVMe`
                                  : `${prod.disk_quota_mb} MB SSD`}
                              </span>
                            </div>
                          )}

                          {prod.bandwidth_quota_mb > 0 && (
                            <div className="flex items-center gap-2">
                              <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>
                                {prod.bandwidth_quota_mb >= 1024
                                  ? `${(prod.bandwidth_quota_mb / 1024).toFixed(0)} GB Tráfego`
                                  : "Tráfego Ilimitado"}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>Proteção Anti-DDoS Inclusa</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>Ativação Imediata</span>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="p-6 pt-0">
                        <Button
                          asChild
                          className={`w-full rounded-2xl font-bold h-11 shadow-sm gap-2 text-xs ${
                            prod.is_featured ? "bg-primary text-primary-foreground" : ""
                          }`}
                        >
                          <Link to="/checkout/$productId" params={{ productId: prod.id }}>
                            <Rocket className="h-4 w-4" /> Contratar Agora
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
