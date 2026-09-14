import { Card, CardContent } from "@/components/ui/card";
import { Cpu, Activity, HardDrive, Monitor } from "lucide-react";
import type { VPSInstanceDetails } from "./types";

interface VPSSpecsCardProps {
  vps: VPSInstanceDetails;
  details: any;
  displayStats: any;
}

export function VPSSpecsCard({ vps, details, displayStats }: VPSSpecsCardProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Especificações
      </h2>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-3xl border-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <Cpu className="h-3.5 w-3.5" /> CPU
            </div>
            <div className="text-2xl font-bold mt-2">
              {vps.cpu_cores || "N/A"}{" "}
              <span className="text-sm font-medium text-muted-foreground">vCPU</span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <Activity className="h-3.5 w-3.5" /> RAM
            </div>
            <div className="text-2xl font-bold mt-2">
              {vps.ram_gb || "N/A"}{" "}
              <span className="text-sm font-medium text-muted-foreground">GB</span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <HardDrive className="h-3.5 w-3.5" /> Disco
            </div>
            <div className="text-2xl font-bold mt-2">
              {displayStats.diskTotalGb || vps.disk_gb || "N/A"}{" "}
              <span className="text-sm font-medium text-muted-foreground">GB</span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <Monitor className="h-3.5 w-3.5" /> Sistema
            </div>
            <div className="text-base font-bold mt-2 truncate">
              {vps.os_template || details.imageName || "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
