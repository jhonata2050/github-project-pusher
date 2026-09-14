import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Lock, RotateCw } from "lucide-react";
import type { DomainDetails } from "./types";

interface DomainSecurityCardProps {
  domain: DomainDetails;
  isLockPending: boolean;
  isAutoRenewPending: boolean;
  onToggleLock: (checked: boolean) => void;
  onToggleAutoRenew: (checked: boolean) => void;
}

export function DomainSecurityCard({
  domain,
  isLockPending,
  isAutoRenewPending,
  onToggleLock,
  onToggleAutoRenew,
}: DomainSecurityCardProps) {
  return (
    <div className="space-y-6">
      {/* Trava de Transferência (Lock) */}
      <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="size-5 text-emerald-600" />
              <h3 className="font-bold text-base text-foreground">Trava de Transferência</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Protege o domínio contra transferências não autorizadas (Transfer Lock).
            </p>
          </div>
          <Switch
            checked={domain.is_locked ?? true}
            onCheckedChange={onToggleLock}
            disabled={isLockPending}
          />
        </div>
      </Card>

      {/* Renovação Automática */}
      <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <RotateCw className="size-5 text-primary" />
              <h3 className="font-bold text-base text-foreground">Auto-Renovação</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gera a fatura de renovação automaticamente 30 dias antes do vencimento.
            </p>
          </div>
          <Switch
            checked={domain.auto_renew ?? true}
            onCheckedChange={onToggleAutoRenew}
            disabled={isAutoRenewPending}
          />
        </div>
      </Card>

      {/* Informações da Assinatura */}
      <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-3">
        <h3 className="font-bold text-xs uppercase text-muted-foreground tracking-wider">
          Resumo do Registro
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Registrador:</span>
            <span className="font-semibold uppercase text-foreground">
              {domain.registrar || "Openprovider"}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Data de Registro:</span>
            <span className="font-semibold text-foreground">
              {new Date(domain.registration_date || domain.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-muted-foreground">Próxima Renovação:</span>
            <span className="font-semibold text-primary">
              {domain.expiry_date
                ? new Date(domain.expiry_date).toLocaleDateString("pt-BR")
                : "---"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
