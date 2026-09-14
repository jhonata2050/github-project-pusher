import { ArrowRight, Check, Globe, Monitor, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceKey } from "../types";
import type { ServiceConfig } from "./catalog-config";

export interface ServiceCategorySelectorProps {
  serviceConfigs: Record<ServiceKey, ServiceConfig>;
  onSelectService: (key: ServiceKey) => void;
  brl: Intl.NumberFormat;
}

export function ServiceCategorySelector({
  serviceConfigs,
  onSelectService,
  brl,
}: ServiceCategorySelectorProps) {
  return (
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

      {/* Grid dos 3 Tipos de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
        {/* 1. Hospedagem DirectAdmin */}
        <div
          onClick={() => onSelectService("directadmin")}
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
          onClick={() => onSelectService("containers")}
          className="group relative rounded-2xl border-2 border-primary shadow-md ring-1 ring-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer p-5 bg-gradient-to-b from-primary/[0.04] to-card"
        >
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
              <span className="text-xs font-black text-foreground">
                {brl.format(serviceConfigs.containers.startingPrice)}/mês
              </span>
            </div>
            <Button className="w-full rounded-xl font-bold h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1.5 cursor-pointer">
              <Rocket className="h-3.5 w-3.5" /> Ver Planos Containers <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* 3. VPS */}
        <div
          onClick={() => onSelectService("vps")}
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
  );
}
