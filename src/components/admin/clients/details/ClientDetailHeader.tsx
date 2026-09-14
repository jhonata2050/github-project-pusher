import { Wallet, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClientDetailHeaderProps } from "./types";

export function ClientDetailHeader({
  client,
  isImpersonating,
  onImpersonate,
  onOpenBalanceModal,
}: ClientDetailHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{client.full_name || "Sem Nome"}</h1>
        <p className="text-sm text-muted-foreground">{client.email}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onOpenBalanceModal}
          variant="outline"
          className="rounded-xl flex items-center gap-2 h-9 text-xs border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold"
        >
          <Wallet className="size-4 text-emerald-600" />
          <span>Saldo: R$ {Number(client.account_balance || 0).toFixed(2)}</span>
          <span className="text-[10px] text-emerald-700 bg-emerald-500/20 px-1.5 py-0.5 rounded-md font-semibold">+ Ajustar Saldo</span>
        </Button>
        <Button 
          variant="outline" 
          className="rounded-xl flex gap-2 h-9 text-xs flex-1 sm:flex-none"
          onClick={onImpersonate}
          disabled={isImpersonating}
        >
          <LogIn className="size-4" /> 
          {isImpersonating ? "Acessando..." : "Acessar como Cliente"}
        </Button>
        <Badge className="h-9 px-3 text-xs" variant={client.status === "active" ? "default" : "secondary"}>
          {client.status === "active" ? "Ativo" : "Inativo"}
        </Badge>
      </div>
    </div>
  );
}
