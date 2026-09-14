import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Cpu, Activity, HardDrive, Database, Network } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { VPSInstanceDetails } from "./types";

interface VPSLiveMetricsCardProps {
  vps: VPSInstanceDetails;
  displayStats: any;
}

export function VPSLiveMetricsCard({ vps, displayStats }: VPSLiveMetricsCardProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Monitoramento em tempo real
        </h2>
        {displayStats.lastUpdate && (
          <span className="text-[11px] text-muted-foreground">
            Atualizado {format(new Date(displayStats.lastUpdate), "dd/MM HH:mm", { locale: ptBR })}
          </span>
        )}
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="rounded-3xl border-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <Cpu className="h-3.5 w-3.5" /> Uso CPU
            </div>
            <div className="text-2xl font-bold mt-2">{displayStats.cpu?.usage ?? "N/A"}%</div>
            <Progress value={displayStats.cpu?.usage || 0} className="h-1.5 mt-3" />
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <Activity className="h-3.5 w-3.5" /> Uso RAM
            </div>
            <div className="text-2xl font-bold mt-2">{displayStats.ram?.usage ?? "N/A"}%</div>
            <Progress value={displayStats.ram?.usage || 0} className="h-1.5 mt-3" />
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <HardDrive className="h-3.5 w-3.5" /> Uso Disco
            </div>
            <div className="text-2xl font-bold mt-2">{displayStats.disk?.usage ?? "N/A"}%</div>
            <Progress value={displayStats.disk?.usage || 0} className="h-1.5 mt-3" />
            <p className="text-[10px] text-muted-foreground mt-2">
              {displayStats.diskUsedGb && displayStats.diskTotalGb
                ? `${displayStats.diskUsedGb} GB de ${displayStats.diskTotalGb} GB`
                : vps.disk_gb
                ? `${Math.round(((displayStats.disk?.usage ?? 0) / 100) * vps.disk_gb)} GB de ${vps.disk_gb} GB`
                : "Capacidade indisponível"}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <Database className="h-3.5 w-3.5" /> IOPS
            </div>
            <div className="text-2xl font-bold mt-2">
              {displayStats.iops?.total ?? "N/A"}
              {displayStats.iops && (
                <span className="text-sm font-medium text-muted-foreground"> /s</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {displayStats.iops
                ? `Leitura ${displayStats.iops.read ?? 0} • Escrita ${displayStats.iops.write ?? 0}`
                : "Requer agente de monitoramento"}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <Network className="h-3.5 w-3.5" /> Rede
            </div>
            <div className="text-2xl font-bold mt-2">
              {displayStats.network
                ? `${Number(displayStats.network.inbound ?? 0).toFixed(2)}`
                : "N/A"}
              {displayStats.network && (
                <span className="text-sm font-medium text-muted-foreground"> MB/s</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {displayStats.network
                ? `Entrada ${Number(displayStats.network.inbound ?? 0).toFixed(2)} • Saída ${Number(displayStats.network.outbound ?? 0).toFixed(2)} MB/s`
                : "Requer agente de monitoramento"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
