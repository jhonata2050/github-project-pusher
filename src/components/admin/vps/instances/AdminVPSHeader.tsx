import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdminVPSHeaderProps } from "./types";

export function AdminVPSHeader({ isSyncing, onSyncClick }: AdminVPSHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de VPS</h1>
        <p className="text-muted-foreground">Monitore e gerencie todas as instâncias VPS dos clientes.</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSyncClick} className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
          <RefreshCw className={cn("mr-2 size-4", isSyncing && "animate-spin")} />
          Sincronizar Contabo
        </Button>
      </div>
    </div>
  );
}
