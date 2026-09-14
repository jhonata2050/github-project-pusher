import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Key, Copy, Check } from "lucide-react";

interface DomainAuthCodeCardProps {
  authCode: string | null;
  copiedEpp: boolean;
  onFetchAuthCode: () => void;
  onCopyAuthCode: () => void;
}

export function DomainAuthCodeCard({
  authCode,
  copiedEpp,
  onFetchAuthCode,
  onCopyAuthCode,
}: DomainAuthCodeCardProps) {
  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="size-5 text-amber-500" /> Código de Transferência (EPP / Auth-Code)
          </CardTitle>
          <CardDescription className="text-xs">
            Necessário caso você queira transferir este domínio para outro registrador no futuro.
          </CardDescription>
        </div>
      </div>

      {authCode ? (
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-2xl border border-border">
          <span className="font-mono text-sm font-bold text-foreground flex-1 break-all">
            {authCode}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyAuthCode}
            className="rounded-xl gap-1.5 text-xs shrink-0"
          >
            {copiedEpp ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            {copiedEpp ? "Copiado!" : "Copiar"}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={onFetchAuthCode}
          className="rounded-xl gap-2 text-xs"
        >
          <Key className="size-3.5 text-amber-500" /> Revelar Código EPP
        </Button>
      )}
    </Card>
  );
}
