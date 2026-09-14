import { Link } from "@tanstack/react-router";
import { Mail, Wallet, Plus, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ProfileAccountSummaryCardProps {
  fullName?: string | null | undefined;
  email?: string | null | undefined;
  userId?: string | null | undefined;
  balance?: number | null | undefined;
}

export function ProfileAccountSummaryCard({
  fullName,
  email,
  userId,
  balance,
}: ProfileAccountSummaryCardProps) {
  const userInitials = (fullName || email || "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const formattedBalance = Number(balance || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Card className="rounded-3xl border shadow-sm overflow-hidden">
      <div className="p-6 bg-muted/40 border-b flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center shadow-sm flex-shrink-0">
          {userInitials}
        </div>
        <div className="overflow-hidden min-w-0">
          <h3 className="font-bold text-sm truncate text-foreground">
            {fullName || "Cliente Eqsam"}
          </h3>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <Mail className="h-3 w-3 flex-shrink-0" />
            {email || "cliente@eqsam.com"}
          </p>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Box de Saldo em Carteira */}
        <div className="p-4 rounded-2xl border bg-card/60 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Wallet className="h-3.5 w-3.5 text-primary" /> Saldo Disponível
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-bold text-primary border-primary/20 bg-primary/5"
            >
              Pré-pago
            </Badge>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">
              R$ {formattedBalance}
            </span>
            <Link to="/invoices">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] font-bold text-primary hover:text-primary gap-1 px-2 rounded-lg"
              >
                <Plus className="h-3 w-3" /> Recarregar
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-2 pt-1 text-xs text-muted-foreground">
          <div className="flex items-center justify-between py-1 border-b border-border/50">
            <span>ID da Conta:</span>
            <span className="font-mono text-[11px] text-foreground font-semibold">
              {(userId || "").slice(0, 12)}...
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span>Status do Cadastro:</span>
            <span className="font-bold text-emerald-500 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Verificado
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
