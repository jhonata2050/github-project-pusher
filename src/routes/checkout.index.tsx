import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  Cpu,
  Globe,
  HardDrive,
  Layers,
  Lock,
  Mail,
  Monitor,
  Plus,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type CheckoutIndexSearchParams = {
  service?: string;
  tab?: string;
  cycle?: "monthly" | "annually";
};

export const Route = createFileRoute("/checkout/")({
  validateSearch: (search: Record<string, unknown>): CheckoutIndexSearchParams => {
    const params: CheckoutIndexSearchParams = {};
    if (typeof search["service"] === "string") params.service = search["service"];
    if (typeof search["tab"] === "string") params.tab = search["tab"];
    if (search["cycle"] === "annually" || search["cycle"] === "monthly") params.cycle = search["cycle"];
    return params;
  },
  head: () => ({
    meta: [
      { title: "Contratar Serviços & Planos — Eqsam" },
      {
        name: "description",
        content: "Escolha a solução ideal: Hospedagem DirectAdmin, Aplicações & Containers (PaaS) ou Servidores Cloud VPS com deploy instantâneo.",
      },
    ],
  }),
  component: CheckoutIndexPage,
});

type ServiceKey = "containers" | "directadmin" | "vps";

function normalizeServiceKey(raw?: string): ServiceKey | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (["containers", "container", "paas", "apps", "app", "bot", "bots"].includes(s)) {
    return "containers";
  }
  if (["directadmin", "hospedagem", "hosting", "web", "sites", "site", "cpanel"].includes(s)) {
    return "directadmin";
  }
  if (["vps", "cloud", "servidores-cloud", "servidor-cloud", "dedicado"].includes(s)) {
    return "vps";
  }
  return null;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function CheckoutIndexPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  // Ciclo de pagamento (mensal ou anual)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">(
    search.cycle || "monthly"
  );

  // Determina se o usuário já veio com um serviço pré-selecionado (ex: ?service=containers ou ?tab=paas)
  const initialKey = normalizeServiceKey(search.service || search.tab);
  const [selectedService, setSelectedService] = useState<ServiceKey | null>(initialKey);

  // Sincroniza se a URL mudar
  useEffect(() => {
    const keyFromUrl = normalizeServiceKey(search.service || search.tab);
    if (keyFromUrl !== selectedService) {
      setSelectedService(keyFromUrl);
    }
  }, [search.service, search.tab]);

  const handleSelectService = (key: ServiceKey | null) => {
    setSelectedService(key);
    const navSearch: CheckoutIndexSearchParams = {};
    if (key) navSearch.service = key;
    if (billingCycle !== "monthly") navSearch.cycle = billingCycle;
    navigate({
      to: "/checkout",
      search: navSearch,
      replace: true,
    });
  };

  // Carrega os grupos de produtos e planos
  const groupsQuery = useQuery({
    queryKey: ["checkout-product-groups-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_groups")
        .select(`
          id,
          name,
          slug,
          description,
          sort_order,
          products (
            id,
            name,
            slug,
            description,
            product_type,
            disk_quota_mb,
            bandwidth_quota_mb,
            domains_limit,
            email_accounts_limit,
            database_limit,
            is_featured,
            sort_order,
            is_visible,
            product_prices (
              id,
              cycle,
              price,
              setup_fee,
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

  // Mapeamento semântico dos grupos para as 3 categorias principais
  const { containersGroup, hostingGroup, vpsGroup } = useMemo(() => {
    let cont = groups.find(
      (g) =>
        g.slug === "apps" ||
        g.name.toLowerCase().includes("paas") ||
        g.name.toLowerCase().includes("aplicações") ||
        g.name.toLowerCase().includes("bots")
    );
    let host = groups.find(
      (g) =>
        g.slug === "hospedagem" ||
        g.name.toLowerCase().includes("servidores") ||
        g.name.toLowerCase().includes("hospedagem") ||
        g.name.toLowerCase().includes("directadmin")
    );
    let vps = groups.find(
      (g) =>
        g.slug === "vps" ||
        g.name.toLowerCase().includes("vps") ||
        g.name.toLowerCase().includes("cloud")
    );

    // Fallbacks inteligentes caso os nomes/slugs divirjam
    if (!cont && groups[2]) cont = groups[2];
    if (!host && groups[0]) host = groups[0];
    if (!vps && groups[1]) vps = groups[1];

    return {
      containersGroup: cont,
      hostingGroup: host,
      vpsGroup: vps,
    };
  }, [groups]);

  // Função para obter o menor preço mensal de um grupo
  const getStartingPrice = (group?: any) => {
    if (!group?.products?.length) return null;
    const prices = group.products
      .flatMap((p: any) =>
        (p.product_prices || [])
          .filter((pr: any) => pr.cycle === "monthly" && pr.is_active)
          .map((pr: any) => Number(pr.price))
      )
      .filter((pr: number) => pr > 0);
    if (!prices.length) return null;
    return Math.min(...prices);
  };

  // Grupo selecionado com base na chave ativa
  const currentGroup = useMemo(() => {
    if (selectedService === "containers") return containersGroup;
    if (selectedService === "directadmin") return hostingGroup;
    if (selectedService === "vps") return vpsGroup;
    return null;
  }, [selectedService, containersGroup, hostingGroup, vpsGroup]);

  // Configuração visual de cada serviço
  const serviceConfigs = {
    directadmin: {
      key: "directadmin" as ServiceKey,
      title: "DirectAdmin",
      shortTitle: "DirectAdmin",
      badge: "Hospedagem Web",
      description:
        "Hospedagem profissional com painel DirectAdmin em português, PHP 8.x, MySQL, e-mails corporativos e instalador WordPress.",
      icon: Globe,
      accentColor: "text-blue-500",
      bgAccent: "bg-blue-500/10",
      borderAccent: "border-blue-500/40",
      startingPrice: getStartingPrice(hostingGroup) ?? 14.9,
      features: [
        "Painel DirectAdmin Completo em Português",
        "PHP 8.1, 8.2, 8.3 & Banco de Dados MySQL",
        "Contas de E-mail Corporativo com Webmail",
        "Instalador 1-Clique (WordPress, etc.) e SSL",
      ],
      group: hostingGroup,
    },
    containers: {
      key: "containers" as ServiceKey,
      title: "Containers",
      shortTitle: "Containers",
      badge: "Mais Popular",
      description:
        "Deploy ágil e isolado para bots de WhatsApp (Baileys, Evolution API), Discord, APIs Node.js/Python e Docker 24/7.",
      icon: Rocket,
      accentColor: "text-primary",
      bgAccent: "bg-primary/10",
      borderAccent: "border-primary",
      startingPrice: getStartingPrice(containersGroup) ?? 9.9,
      features: [
        "Cluster Docker Swarm de Alta Disponibilidade",
        "Otimizado para Bots de WhatsApp & Discord 24/7",
        "Deploy Automático com Git / GitHub",
        "Templates em 1-Clique com SSL Grátis",
      ],
      group: containersGroup,
    },
    vps: {
      key: "vps" as ServiceKey,
      title: "VPS",
      shortTitle: "VPS",
      badge: "Performance Dedicada",
      description:
        "Instâncias de nuvem com processadores modernos, discos 100% NVMe, IP próprio dedicado e acesso root SSH irrestrito.",
      icon: Monitor,
      accentColor: "text-amber-500",
      bgAccent: "bg-amber-500/10",
      borderAccent: "border-amber-500/40",
      startingPrice: getStartingPrice(vpsGroup) ?? 69.9,
      features: [
        "Acesso Root Total via Terminal SSH",
        "Endereço IPv4 Dedicado Próprio Incluso",
        "Armazenamento 100% NVMe Ultra-rápido",
        "Proteção Anti-DDoS Avançada Inclusa",
      ],
      group: vpsGroup,
    },
  };

  return (
    <AppShell
      area="client"
      breadcrumb={
        <div className="flex items-center gap-1 text-xs">
          <Link
            to="/checkout"
            onClick={() => handleSelectService(null)}
            className="hover:text-foreground font-medium text-muted-foreground"
          >
            Checkout
          </Link>
          {selectedService && (
            <>
              <span className="text-muted-foreground/60">/</span>
              <span className="font-semibold text-foreground">
                {serviceConfigs[selectedService].shortTitle}
              </span>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6 pb-6 max-w-6xl mx-auto">
        {/* =========================================================================
            TELA 1: SELEÇÃO COMPACTA E ELEGANTE DO TIPO DE SERVIÇO
            Exibida quando nenhum serviço estiver selecionado
           ========================================================================= */}
        {!selectedService ? (
          <div className="space-y-6 py-1">
            {/* Cabeçalho Compacto */}
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" /> Escolha sua Infraestrutura
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                O que você deseja contratar hoje?
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Selecione a categoria de serviço ideal para o seu projeto com ativação instantânea.
              </p>
            </div>

            {/* Grid dos 3 Tipos de Serviços (Cards Compactos & Elegantes) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
              {/* 1. Hospedagem DirectAdmin */}
              <div
                onClick={() => handleSelectService("directadmin")}
                className="group relative rounded-2xl border border-border/80 bg-card hover:border-blue-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer p-5"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
                      <Globe className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg">
                      A partir de {brl.format(serviceConfigs.directadmin.startingPrice)}/mês
                    </span>
                  </div>

                  <div>
                    <h2 className="text-base sm:text-lg font-bold tracking-tight group-hover:text-blue-500 transition-colors">
                      DirectAdmin
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
                      Sites em WordPress, PHP, MySQL, e-mails corporativos e painel DirectAdmin em português.
                    </p>
                  </div>

                  <div className="border-t border-border/50 pt-3 space-y-1.5">
                    {serviceConfigs.directadmin.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-auto">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-bold h-9 text-xs border-border group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all gap-1.5 cursor-pointer"
                  >
                    Ver Planos DirectAdmin <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* 2. Containers (DESTAQUE / MAIS POPULAR) */}
              <div
                onClick={() => handleSelectService("containers")}
                className="group relative rounded-2xl border-2 border-primary shadow-md ring-1 ring-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer p-5 bg-gradient-to-b from-primary/[0.04] to-card"
              >
                {/* Badge Destaque Elegante */}
                <div className="absolute top-3 right-3">
                  <span className="bg-primary text-primary-foreground text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> Mais Popular
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/25 group-hover:scale-105 transition-transform">
                      <Rocket className="h-5 w-5" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold tracking-tight text-primary">
                        Containers
                      </h2>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
                      Deploy ágil para bots de WhatsApp (Baileys/Evolution), Discord, APIs Node.js/Python e Docker 24/7.
                    </p>
                  </div>

                  <div className="border-t border-primary/20 pt-3 space-y-1.5">
                    {serviceConfigs.containers.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span className="font-medium text-foreground/90">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-auto space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">A partir de</span>
                    <span className="text-xs font-black text-foreground">{brl.format(serviceConfigs.containers.startingPrice)}/mês</span>
                  </div>
                  <Button className="w-full rounded-xl font-bold h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1.5 cursor-pointer">
                    <Rocket className="h-3.5 w-3.5" /> Ver Planos Containers <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* 3. VPS */}
              <div
                onClick={() => handleSelectService("vps")}
                className="group relative rounded-2xl border border-border/80 bg-card hover:border-amber-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer p-5"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
                      <Monitor className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg">
                      A partir de {brl.format(serviceConfigs.vps.startingPrice)}/mês
                    </span>
                  </div>

                  <div>
                    <h2 className="text-base sm:text-lg font-bold tracking-tight group-hover:text-amber-500 transition-colors">
                      VPS
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
                      Instâncias dedicadas com alta performance, discos 100% NVMe, IP próprio e acesso root SSH.
                    </p>
                  </div>

                  <div className="border-t border-border/50 pt-3 space-y-1.5">
                    {serviceConfigs.vps.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-auto">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-bold h-9 text-xs border-border group-hover:bg-amber-600 group-hover:border-amber-600 group-hover:text-white transition-all gap-1.5 cursor-pointer"
                  >
                    Ver Planos VPS <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
              TELA 2: CATÁLOGO DE PLANOS DO SERVIÇO SELECIONADO (COMPACTO & MODERNO)
              Exibida quando houver serviço ativo
             ========================================================================= */
          <div className="space-y-6">
            {/* Barra de Navegação Compacta & Alternador de Ciclo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectService(null)}
                  className="rounded-xl text-xs font-semibold gap-1.5 h-8 px-2.5 text-muted-foreground hover:text-foreground cursor-pointer -ml-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </Button>

                <div className="h-4 w-px bg-border/60" />

                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg border", serviceConfigs[selectedService].bgAccent, serviceConfigs[selectedService].accentColor)}>
                    {(() => {
                      const Icon = serviceConfigs[selectedService].icon;
                      return <Icon className="h-4 w-4" />;
                    })()}
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-none">
                      {serviceConfigs[selectedService].title}
                    </h1>
                  </div>
                </div>
              </div>

              {/* Ciclo de Pagamento Compacto */}
              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    billingCycle === "monthly"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("annually")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                    billingCycle === "annually"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Anual
                  <span className="bg-primary/20 text-primary text-[9px] px-1 py-0.2 rounded font-extrabold">
                    -15%
                  </span>
                </button>
              </div>
            </div>

            {/* Pílulas rápidas para alternar categorias */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              {(["directadmin", "containers", "vps"] as ServiceKey[]).map((key) => {
                const conf = serviceConfigs[key];
                const isActive = selectedService === key;
                const Icon = conf.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectService(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border/60"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{conf.shortTitle}</span>
                    {conf.group && (
                      <span
                        className={cn(
                          "ml-1 text-[10px] px-1.5 py-0.2 rounded font-mono",
                          isActive
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {conf.group.products.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Grid dos Planos do Grupo Atual (Cards Compactos & Polidos) */}
            {groupsQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-80 rounded-2xl" />
                ))}
              </div>
            ) : !currentGroup || currentGroup.products.length === 0 ? (
              <Card className="rounded-2xl p-8 text-center border-dashed">
                <Box className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-bold">Nenhum plano disponível nesta categoria</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Novos recursos serão disponibilizados em breve.
                </p>
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={() => handleSelectService(null)} className="rounded-xl text-xs">
                    Voltar para serviços
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {currentGroup.products.map((prod) => {
                  const priceObj =
                    prod.product_prices.find(
                      (p: any) => p.cycle === billingCycle && p.is_active
                    ) ||
                    prod.product_prices.find((p: any) => p.is_active) ||
                    prod.product_prices[0];

                  const priceVal = priceObj ? Number(priceObj.price) : 0;
                  const cycleLabel =
                    priceObj?.cycle === "annually"
                      ? "/ano"
                      : priceObj?.cycle === "quarterly"
                      ? "/tri"
                      : "/mês";

                  const isPaaS =
                    selectedService === "containers" ||
                    currentGroup.name.toLowerCase().includes("paas") ||
                    currentGroup.name.toLowerCase().includes("aplicações") ||
                    prod.name.includes("MB") ||
                    prod.name.includes("GB");

                  return (
                    <div
                      key={prod.id}
                      className={cn(
                        "rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden bg-card hover:shadow-md",
                        prod.is_featured
                          ? "border-primary shadow-xs ring-1 ring-primary/25"
                          : "hover:border-primary/40 border-border/80"
                      )}
                    >
                      {prod.is_featured && (
                        <div className="absolute top-0 right-0">
                          <span className="bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-bl-xl shadow-2xs">
                            Popular
                          </span>
                        </div>
                      )}

                      <div className="p-4 sm:p-5 pb-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3 border border-primary/20">
                          {isPaaS ? (
                            <Zap className="h-4 w-4 fill-primary/30" />
                          ) : selectedService === "vps" ? (
                            <Monitor className="h-4 w-4" />
                          ) : (
                            <Server className="h-4 w-4" />
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold leading-snug text-foreground">
                          {prod.name}
                        </h3>
                        <p className="text-xs text-muted-foreground min-h-[2.25rem] mt-1 leading-relaxed line-clamp-2">
                          {prod.description ||
                            "Recursos de computação com alta disponibilidade e isolamento."}
                        </p>

                        <div className="mt-3 pt-3 border-t border-border/50 flex items-baseline gap-1">
                          <span className="text-2xl font-black tracking-tight text-foreground">
                            {brl.format(priceVal)}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {cycleLabel}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 pt-0 space-y-2 mt-auto">
                        <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border/50 pt-2.5 font-medium">
                          {prod.disk_quota_mb && prod.disk_quota_mb > 0 && (
                            <div className="flex items-center gap-1.5">
                              <HardDrive className="h-3 w-3 text-primary shrink-0" />
                              <span>
                                {prod.disk_quota_mb >= 1024
                                  ? `${(prod.disk_quota_mb / 1024).toFixed(0)} GB SSD NVMe`
                                  : `${prod.disk_quota_mb} MB SSD`}
                              </span>
                            </div>
                          )}

                          {prod.bandwidth_quota_mb && prod.bandwidth_quota_mb > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <Layers className="h-3 w-3 text-primary shrink-0" />
                              <span>
                                {prod.bandwidth_quota_mb >= 1024
                                  ? `${(prod.bandwidth_quota_mb / 1024).toFixed(0)} GB Tráfego`
                                  : `${prod.bandwidth_quota_mb} MB Tráfego`}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Layers className="h-3 w-3 text-primary shrink-0" />
                              <span>Tráfego Ilimitado</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3 w-3 text-primary shrink-0" />
                            <span>Anti-DDoS Incluso</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Check className="h-3 w-3 text-primary shrink-0" />
                            <span>Ativação Imediata</span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Button
                            asChild
                            size="sm"
                            className={cn(
                              "w-full rounded-xl font-bold h-9 shadow-2xs gap-1.5 text-xs cursor-pointer",
                              prod.is_featured ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                            )}
                          >
                            <Link to="/checkout/$productId" params={{ productId: prod.id }}>
                              <Rocket className="h-3.5 w-3.5" /> Contratar Agora
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
