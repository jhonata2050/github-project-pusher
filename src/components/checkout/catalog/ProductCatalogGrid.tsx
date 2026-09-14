import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Box,
  Check,
  HardDrive,
  Layers,
  Monitor,
  Rocket,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ServiceKey } from "../types";
import type { ServiceConfig } from "./catalog-config";

export interface ProductCatalogGridProps {
  selectedService: ServiceKey;
  serviceConfigs: Record<ServiceKey, ServiceConfig>;
  billingCycle: "monthly" | "annually";
  setBillingCycle: (cycle: "monthly" | "annually") => void;
  currentGroup: any;
  onSelectService: (key: ServiceKey | null) => void;
  isLoading: boolean;
  brl: Intl.NumberFormat;
}

const SERVICE_KEYS: ServiceKey[] = ["directadmin", "containers", "vps"];

export function ProductCatalogGrid({
  selectedService,
  serviceConfigs,
  billingCycle,
  setBillingCycle,
  currentGroup,
  onSelectService,
  isLoading,
  brl,
}: ProductCatalogGridProps) {
  const currentConfig = serviceConfigs[selectedService];
  const Icon = currentConfig.icon;

  return (
    <div className="space-y-6">
      {/* Barra de Navegação Compacta & Alternador de Ciclo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectService(null)}
            className="rounded-xl text-xs font-semibold gap-1.5 h-8 px-2.5 text-muted-foreground hover:text-foreground cursor-pointer -ml-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>

          <div className="h-4 w-px bg-border/60" />

          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg border", currentConfig.bgAccent, currentConfig.accentColor)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-none">
                {currentConfig.title}
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
        {SERVICE_KEYS.map((key) => {
          const conf = serviceConfigs[key];
          const isActive = selectedService === key;
          const ServiceIcon = conf.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectService(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border/60"
              )}
            >
              <ServiceIcon className="h-3 w-3" />
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

      {/* Grid dos Planos do Grupo Atual */}
      {isLoading ? (
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
            <Button variant="outline" size="sm" onClick={() => onSelectService(null)} className="rounded-xl text-xs cursor-pointer">
              Voltar para serviços
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {currentGroup.products.map((prod: any) => {
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
                    {prod.description || "Recursos de computação com alta disponibilidade e isolamento."}
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
  );
}
