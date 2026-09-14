import { Link } from "@tanstack/react-router";
import { ShieldAlert, Search, Clock, ArrowRight, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProvisioningAlertCardProps, ErrorService } from "./types";

export function getSLAStatus(date: string) {
  const hours = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
  if (hours > 24) return { label: "CRÍTICO (>24h)", color: "bg-red-500 text-white" };
  if (hours > 4) return { label: "ALERTA (>4h)", color: "bg-orange-500 text-white" };
  return { label: "PENDENTE", color: "bg-blue-500 text-white" };
}

export function ProvisioningAlertCard({
  services = [],
  searchTerm,
  onSearchChange,
  onSelectService,
}: ProvisioningAlertCardProps) {
  if (services.length === 0) return null;

  const filteredServices = services.filter((s: ErrorService) => {
    const search = searchTerm.toLowerCase();
    return (
      s.domain?.toLowerCase().includes(search) ||
      s.username?.toLowerCase().includes(search) ||
      s.notes?.toLowerCase().includes(search) ||
      s.error_message?.toLowerCase().includes(search) ||
      s.profiles?.full_name?.toLowerCase().includes(search) ||
      s.profiles?.email?.toLowerCase().includes(search)
    );
  });

  return (
    <Card className="rounded-3xl border-red-500/20 bg-red-500/[0.02] shadow-sm overflow-hidden border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600 shrink-0">
            <ShieldAlert className="size-4" />
            Provisionamento & SLA
          </CardTitle>
          <div className="relative w-full max-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Filtrar por cliente/produto..."
              className="h-8 pl-8 text-[10px] rounded-full bg-background/50"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y divide-red-500/10 max-h-[400px] overflow-y-auto">
          {filteredServices.length > 0 ? (
            filteredServices.map((service: ErrorService) => {
              const sla = getSLAStatus(service.updated_at);
              return (
                <div 
                  key={service.id} 
                  className="flex items-center justify-between p-3 px-6 hover:bg-red-500/5 transition-colors"
                >
                  <div className="flex flex-col gap-0.5 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate">
                        {service.domain || service.username || `#${service.id.slice(0, 8)}`}
                      </span>
                      <Badge className={cn("text-[8px] px-1.5 h-4 border-none font-black", sla.color)}>
                        {sla.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-medium">
                      <span className="text-brand font-bold uppercase">
                        {service.profiles?.full_name || "Cliente"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="size-2.5" />
                        {formatDistanceToNow(new Date(service.updated_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <span className="text-[10px] text-red-500 font-bold line-clamp-2 leading-tight mt-1 bg-red-500/5 p-1 rounded-md border border-red-500/10">
                      {service.notes || service.error_message || "Aguardando processamento manual"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Link 
                      to="/admin/clients/$clientId" 
                      params={{ clientId: service.user_id }}
                      className="p-1.5 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
                      title="Ver Cliente"
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                    <button 
                      onClick={() => onSelectService(service.id)} 
                      className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                      title="Ver Histórico"
                    >
                      <History className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Nenhuma pendência encontrada com esses filtros.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
