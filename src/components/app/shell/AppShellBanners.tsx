import { X, LogOut as LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AppShellBannersProps {
  impersonatedClientId: string | null;
  clientName?: string | null | undefined;
  stopImpersonating: () => void;
  hasOverdue: boolean;
  hideBanner: boolean;
  setHideBanner: (hide: boolean) => void;
}

export function AppShellBanners({
  impersonatedClientId,
  clientName,
  stopImpersonating,
  hasOverdue,
  hideBanner,
  setHideBanner,
}: AppShellBannersProps) {
  return (
    <>
      {impersonatedClientId && (
        <div className="bg-brand p-3 text-center text-brand-foreground font-medium border-b border-brand/20 flex items-center justify-center gap-4">
          Você está visualizando o painel como cliente ({clientName || "Cliente"}).
          <Button
            size="sm"
            variant="secondary"
            onClick={stopImpersonating}
            className="rounded-xl h-8 text-xs flex gap-2"
          >
            <LogOutIcon className="size-3" /> Sair do modo cliente
          </Button>
        </div>
      )}
      {hasOverdue && !hideBanner && (
        <div className="bg-destructive p-3 text-center text-destructive-foreground font-medium border-b border-brand/20 relative animate-in fade-in slide-in-from-top duration-300">
          Você possui faturas vencidas. Regularize seu débito para evitar suspensão dos serviços.
          <button
            onClick={() => setHideBanner(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </>
  );
}
