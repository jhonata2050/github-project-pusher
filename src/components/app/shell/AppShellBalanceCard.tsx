import { Link } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

export interface AppShellBalanceCardProps {
  isAdminArea: boolean;
  profile: any;
}

export function AppShellBalanceCard({ isAdminArea, profile }: AppShellBalanceCardProps) {
  if (isAdminArea) {
    return (
      <div className="border-y border-sidebar-border py-3">
        <div className="rounded-xl px-2 py-1">
          <p className="text-sm font-semibold text-sidebar-foreground">Administração</p>
          <p className="text-xs text-muted-foreground">Acesso master da plataforma</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="border-y border-sidebar-border py-3">
      <div className="rounded-xl px-2 py-1">
        <p className="text-sm font-semibold text-sidebar-foreground truncate">
          {profile?.company_name ?? profile?.full_name ?? "Minha conta"}
        </p>
        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
        <Link
          to="/wallet"
          className="mt-2.5 flex items-center justify-between bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Wallet className="size-3.5 text-emerald-600" />
            <span className="text-[11px] font-semibold text-muted-foreground">Saldo em conta:</span>
          </div>
          <span className="text-xs font-extrabold text-emerald-600">
            R$ {Number(profile?.account_balance || 0).toFixed(2)}
          </span>
        </Link>
      </div>
    </div>
  );
}
