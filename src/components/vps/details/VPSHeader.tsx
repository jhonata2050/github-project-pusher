import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { isVPSOnline, getVPSStatusLabel } from "@/lib/vps-status";
import { cn } from "@/lib/utils";
import type { VPSInstanceDetails } from "./types";

interface VPSHeaderProps {
  vps: VPSInstanceDetails;
  details: any;
  ipAddress?: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function VPSHeader({
  vps,
  details,
  ipAddress,
  isLoading,
  onRefresh,
}: VPSHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/vps">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {vps.ip_address || details.displayName || vps.os_template || "Servidor VPS"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={isVPSOnline(details.status ?? vps.status) ? "default" : "secondary"}
              className="rounded-full"
            >
              {getVPSStatusLabel(details.status ?? vps.status)}
            </Badge>
            {ipAddress && (
              <span className="text-sm text-muted-foreground italic">IP: {ipAddress}</span>
            )}
            {(vps.region || details.regionName) && (
              <span className="text-sm text-muted-foreground">
                • {vps.region || details.regionName}
              </span>
            )}
          </div>
        </div>
      </div>
      <Button variant="outline" onClick={onRefresh} className="rounded-xl">
        <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
        Sincronizar
      </Button>
    </div>
  );
}
