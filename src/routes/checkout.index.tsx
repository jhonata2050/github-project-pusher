import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";

import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import {
  normalizeServiceKey,
  brl,
  type CheckoutIndexSearchParams,
  type ServiceKey,
} from "@/components/checkout/types";
import { buildServiceConfigs } from "@/components/checkout/catalog/catalog-config";
import { ServiceCategorySelector } from "@/components/checkout/catalog/ServiceCategorySelector";
import { ProductCatalogGrid } from "@/components/checkout/catalog/ProductCatalogGrid";

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

function CheckoutIndexPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">(
    search.cycle || "monthly"
  );

  const initialKey = normalizeServiceKey(search.service || search.tab);
  const [selectedService, setSelectedService] = useState<ServiceKey | null>(initialKey);

  useEffect(() => {
    const keyFromUrl = normalizeServiceKey(search.service || search.tab);
    if (keyFromUrl !== selectedService) {
      setSelectedService(keyFromUrl);
    }
  }, [search.service, search.tab, selectedService]);

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

    if (!cont && groups[2]) cont = groups[2];
    if (!host && groups[0]) host = groups[0];
    if (!vps && groups[1]) vps = groups[1];

    return {
      containersGroup: cont,
      hostingGroup: host,
      vpsGroup: vps,
    };
  }, [groups]);

  const serviceConfigs = useMemo(
    () => buildServiceConfigs(hostingGroup, containersGroup, vpsGroup),
    [hostingGroup, containersGroup, vpsGroup]
  );

  const currentGroup = useMemo(() => {
    if (selectedService === "containers") return containersGroup;
    if (selectedService === "directadmin") return hostingGroup;
    if (selectedService === "vps") return vpsGroup;
    return null;
  }, [selectedService, containersGroup, hostingGroup, vpsGroup]);

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
        {!selectedService ? (
          <ServiceCategorySelector
            serviceConfigs={serviceConfigs}
            onSelectService={handleSelectService}
            brl={brl}
          />
        ) : (
          <ProductCatalogGrid
            selectedService={selectedService}
            serviceConfigs={serviceConfigs}
            billingCycle={billingCycle}
            setBillingCycle={setBillingCycle}
            currentGroup={currentGroup}
            onSelectService={handleSelectService}
            isLoading={groupsQuery.isLoading}
            brl={brl}
          />
        )}
      </div>
    </AppShell>
  );
}
