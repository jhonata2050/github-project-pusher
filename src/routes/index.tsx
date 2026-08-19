
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, HardDrive, Mail, Server } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/use-branding";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EQSAM CLOUD — Servidores VPS e Hospedagem de Alta Performance" },
      {
        name: "description",
        content:
          "Hospedagem e Servidores VPS de alta performance com painel próprio, faturas em Pix, cartão e boleto, e suporte especializado.",
      },
      { property: "og:title", content: "EQSAM CLOUD — Servidores VPS e Hospedagem" },
      {
        property: "og:description",
        content: "Hospedagem de alto desempenho com provisionamento automático e suporte por tickets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function Index() {
  const { user } = useAuth();
  const branding = useBranding();
  const groups = useQuery({
    queryKey: ["public-catalog-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_groups")
        .select(`
          id, 
          name, 
          description, 
          sort_order,
          products(
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
            product_prices(cycle, price, is_active)
          )
        `)
        .eq("is_visible", true)
        .order("sort_order");
      
      if (error) throw error;

      // Filtrar grupos que não possuem produtos visíveis
      return (data ?? []).map(group => ({
        ...group,
        products: (group.products as any[]).filter(p => p.is_visible).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      })).filter(group => group.products.length > 0);
    },
  });


  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <span className="flex min-w-0 items-center gap-2 text-lg font-semibold">
          {branding.logo_url ? (
            <span className="flex items-center rounded-2xl px-4 py-2.5">
              <img
                src={branding.logo_url}
                alt={branding.app_name}
                className="h-8 w-auto max-w-[180px] object-contain sm:h-9 sm:max-w-[220px]"
              />
            </span>
          ) : (
            <>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
                {branding.app_name.charAt(0)}
              </span>
              <span className="truncate">{branding.app_name}</span>
            </>
          )}
        </span>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/auth" search={{ }}>Área do cliente</Link>
        </Button>
      </header>

      <section className="lime-backdrop px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Servidores <span className="text-brand">EQSAM CLOUD</span> e hospedagem de alta performance sem burocracia
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Contas criadas automaticamente no DirectAdmin, faturas em Pix, cartão e boleto, tickets de
            suporte e controle financeiro completo — tudo em um só lugar.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-xl bg-foreground text-background hover:bg-foreground/90">
              <Link to="/auth" search={{ }}>Criar minha conta</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl">
              <a href="#planos">Ver planos</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Escolha seu plano</h2>
        <p className="mt-2 text-center text-muted-foreground">
          Todos os planos incluem suporte prioritário, backups diários e infraestrutura escalável.
        </p>

        {groups.isLoading ? (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-80 rounded-3xl" />
            ))}
          </div>
        ) : groups.data && groups.data.length > 0 ? (
          <Tabs defaultValue={groups.data[0]!.id} className="mt-10 w-full">




            <div className="flex justify-center">
              <TabsList className="h-auto w-fit flex-wrap justify-center gap-2 rounded-2xl bg-muted/50 p-2 border border-border">
                {groups.data.map((group) => (
                  <TabsTrigger
                    key={group.id}
                    value={group.id}
                    className="rounded-xl px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    {group.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {groups.data.map((group) => (
              <TabsContent key={group.id} value={group.id} className="mt-8 animate-in fade-in zoom-in duration-300">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.products.map((plan) => {
                    const monthly = plan.product_prices?.find((p: any) => p.cycle === "monthly" && p.is_active);
                    return (
                      <article
                        key={plan.id}
                        className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:scale-[1.02]"
                      >
                        {plan.is_featured && (
                          <span className="mb-3 w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                            Mais vendido
                          </span>
                        )}
                        <h3 className="text-lg font-semibold">{plan.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2 min-h-[40px]">{plan.description}</p>
                        <div className="mt-5 space-y-1">
                          <p className="text-3xl font-semibold tracking-tight">
                            {monthly ? brl.format(Number(monthly.price)) : "Sob consulta"}
                            <span className="text-base font-normal text-muted-foreground">/mês</span>
                          </p>
                          {monthly && (
                            <p className="text-xs text-muted-foreground">
                              Total no ciclo: {brl.format(Number(monthly.price))}
                            </p>
                          )}
                        </div>
                        <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <HardDrive className="size-4 text-brand" />
                            {plan.disk_quota_mb ? `${Math.round(plan.disk_quota_mb / 1024)} GB de disco` : "Disco flexível"}
                          </li>
                          <li className="flex items-center gap-2">
                            <Server className="size-4 text-brand" />
                            {plan.domains_limit ? `${plan.domains_limit} domínio(s)` : "Domínios ilimitados"}
                          </li>
                          <li className="flex items-center gap-2">
                            <Mail className="size-4 text-brand" />
                            {plan.email_accounts_limit
                              ? `${plan.email_accounts_limit} contas de e-mail`
                              : "E-mails ilimitados"}
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="size-4 text-brand" />
                            Infraestrutura EQSAM CLOUD incluída
                          </li>
                        </ul>
                        <Button 
                          asChild 
                          className="mt-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Link 
                            to={user ? "/checkout/$productId" : "/auth"} 
                            params={user ? { productId: plan.id } : {}}
                            search={user ? {} : { redirect: `/checkout/${plan.id}` } as any}
                          >
                            Contratar
                          </Link>
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>


        ) : (
          <p className="mt-20 text-center text-muted-foreground">Nenhum plano disponível no momento.</p>
        )}

      </section>

      <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {branding.app_name} — plataforma de gestão de serviços de hospedagem.
      </footer>
    </div>
  );
}
