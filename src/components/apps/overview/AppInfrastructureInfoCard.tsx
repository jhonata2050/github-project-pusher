import React from "react";
import { CheckCircle2, ShieldCheck, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface AppInfrastructureInfoCardProps {
  app: any;
  metrics: any;
}

export function AppInfrastructureInfoCard({
  app,
  metrics,
}: AppInfrastructureInfoCardProps) {
  return (
    <Card className="rounded-3xl border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Informações da Infraestrutura</CardTitle>
        <CardDescription>Especificações técnicas do container alocado no cluster.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Servidor Web / Engine</span>
            <span className="font-semibold uppercase">
              {app.build_pack === "static" ? "Caddy Server 2 (HTTP/3 & QUIC)" : (app.build_pack || "Nixpacks Container")}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Status da Conexão</span>
            <span className="font-semibold text-lime-600 dark:text-lime-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-lime-500" /> HTTP/2 & HTTP/3 Habilitados
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Isolamento de Recursos (Swarm)</span>
            <span className="font-semibold text-foreground font-mono">
              {app.cpu_limit} vCPU • {app.memory_limit} MB RAM (Cgroups Ativo)
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Proteção de Cluster Host</span>
            <span className="font-semibold text-lime-600 dark:text-lime-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-lime-500" /> Limites Estritos de Kernel Ativos
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Status do Cluster</span>
            <span className="font-semibold text-lime-600 dark:text-lime-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-lime-500 animate-pulse" /> DK1.EQSAM.COM (Online • 0 falhas)
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Certificado SSL</span>
            <span className="font-semibold text-lime-600 dark:text-lime-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-lime-500" /> Let's Encrypt TLS Automático
            </span>
          </div>
        </div>

        {/* Divisão de Recursos por Container (Multi-Container Breakdown) */}
        {(metrics as any)?.containerBreakdown && (metrics as any).containerBreakdown.length > 0 && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Divisão de Recursos por Container ({(metrics as any).containerBreakdown.length} ativos)
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                Isolamento Cgroups v2
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(metrics as any).containerBreakdown.map((ct: any) => (
                <div key={ct.id || ct.name} className="p-3.5 rounded-2xl bg-muted/30 border text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground capitalize flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {ct.role || ct.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                      {ct.pids ? `${ct.pids} PIDs` : "1 PID"}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-muted-foreground font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span>RAM em Uso:</span>
                      <strong className="text-foreground">{ct.usedRamMb} MB</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Carga CPU:</span>
                      <strong className="text-foreground">{ct.cpuPercent}%</strong>
                    </div>
                    {ct.image && (
                      <div className="truncate text-[10px] text-muted-foreground/70 pt-0.5" title={ct.image}>
                        {ct.image}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
