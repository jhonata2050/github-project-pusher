import { Badge } from "@/components/ui/badge";
import { Sparkles, Gift } from "lucide-react";
import type { AffiliateBannerProps } from "./types";

export function AffiliateBanner({ commissionPercent = 10 }: AffiliateBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/95 via-primary to-indigo-900 text-white p-6 sm:p-8 shadow-xl">
      <div className="relative z-10 max-w-2xl space-y-3">
        <Badge
          variant="outline"
          className="text-white border-white/30 bg-white/10 backdrop-blur-sm px-3 py-1 font-medium"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300" />
          Ganhe {commissionPercent}% de Comissão Recorrente
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Programa de Afiliados: Indique e Ganhe
        </h1>
        <p className="text-white/80 text-sm sm:text-base leading-relaxed">
          Compartilhe seu link exclusivo com amigos, clientes e parceiros. A cada fatura paga por alguém que você indicou, você ganha <strong>{commissionPercent}% de comissão</strong> direto no seu saldo!
        </p>
      </div>
      <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
        <Gift className="w-64 h-64 text-white" />
      </div>
    </div>
  );
}
