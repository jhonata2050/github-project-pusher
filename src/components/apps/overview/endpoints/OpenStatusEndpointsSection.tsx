import React from "react";
import { Copy, ExternalLink, ShieldCheck, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { extractAppHash12 } from "@/lib/app-subdomain";

interface OpenStatusEndpointsSectionProps {
  app: any;
  safeOnlineUrl: string;
  pendingEnvs: any[];
  setActiveTab: (tab: string) => void;
  copyToClipboard: (text: string, key?: string) => void;
}

export function OpenStatusEndpointsSection({
  app,
  safeOnlineUrl,
  pendingEnvs,
  setActiveTab,
  copyToClipboard,
}: OpenStatusEndpointsSectionProps) {
  const cleanAppHash = extractAppHash12(app.id || (app as any).service_id);
  const adminDashboardUrl = `https://admin-openstatus-${cleanAppHash}.dk1.eqsam.com`;
  const isResendPending = pendingEnvs.some((e) => e.key === "RESEND_API_KEY");

  return (
    <>
      {/* Página de Status Pública */}
      <div className="py-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              Página de Status (Pública)
            </span>
            <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
              Porta 3000 • Web
            </Badge>
            <span className="text-[11px] text-muted-foreground">Visão dos Clientes</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-primary font-semibold bg-primary/10 px-2.5 py-1 rounded-lg break-all">
              {safeOnlineUrl}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs gap-1.5"
            onClick={() => copyToClipboard(safeOnlineUrl)}
          >
            <Copy className="h-3.5 w-3.5" /> Copiar URL
          </Button>
          <Button
            size="sm"
            asChild
            className="h-8 rounded-xl text-xs gap-1.5 bg-primary font-bold shadow-sm"
          >
            <a href={safeOnlineUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Acessar Status Page
            </a>
          </Button>
        </div>
      </div>

      {/* Dashboard Administrativo */}
      <div className="py-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              Dashboard Administrativo (Admin)
            </span>
            <Badge
              variant="outline"
              className="font-mono text-[10px] px-2 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
            >
              Porta 3000 • Painel Next.js
            </Badge>
            <span className="text-[11px] text-muted-foreground">Gerenciador de Monitores</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-lg break-all">
              {adminDashboardUrl}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs gap-1.5"
            onClick={() => copyToClipboard(adminDashboardUrl)}
          >
            <Copy className="h-3.5 w-3.5" /> Copiar URL
          </Button>
          <Button
            size="sm"
            asChild
            className="h-8 rounded-xl text-xs gap-1.5 bg-primary font-bold shadow-sm"
          >
            <a href={adminDashboardUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Acessar Dashboard Admin
            </a>
          </Button>
        </div>
      </div>

      <div
        className={`p-3.5 rounded-2xl border text-[11px] space-y-2 ${
          isResendPending
            ? "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200"
            : "bg-muted/40 border text-muted-foreground"
        }`}
      >
        <div className="font-semibold text-foreground flex items-center justify-between gap-1.5 flex-wrap">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Credenciais e Autenticação do Dashboard
          </span>
          {isResendPending && (
            <Badge
              variant="outline"
              className="text-[9px] font-extrabold uppercase text-amber-700 dark:text-amber-300 border-amber-500/50 bg-amber-500/20"
            >
              Chave Resend Pendente
            </Badge>
          )}
        </div>
        <p className="leading-relaxed">
          Usuário inicial provisionado:{" "}
          <code className="font-mono font-bold text-foreground">ping@openstatus.dev</code>. O
          OpenStatus opera com Magic Links (NextAuth).
          {isResendPending ? (
            <span className="block mt-1.5 font-medium text-amber-800 dark:text-amber-300">
              ⚠️ <strong>Atenção:</strong> Sua chave{" "}
              <code className="font-mono font-bold bg-amber-500/20 px-1 py-0.5 rounded">
                RESEND_API_KEY
              </code>{" "}
              ainda está com o valor temporário de exemplo. O envio do Magic Link para autenticação
              no painel falhará até que você cadastre sua chave real do Resend na aba{" "}
              <strong>Variáveis</strong> e reinicie a aplicação.
            </span>
          ) : (
            <span>
              {" "}
              Para envio de links de login por e-mail em produção, cadastre sua chave gratuita{" "}
              <code className="font-mono text-primary font-semibold">RESEND_API_KEY</code> na aba{" "}
              <strong>Variáveis</strong> acima.
            </span>
          )}
        </p>
        {isResendPending && (
          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs rounded-xl gap-1.5 border-amber-500/50 hover:bg-amber-500/20 text-amber-900 dark:text-amber-100 font-bold"
              onClick={() => setActiveTab("envs")}
            >
              <KeyRound className="h-3 w-3" /> Configurar RESEND_API_KEY na aba Variáveis
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
