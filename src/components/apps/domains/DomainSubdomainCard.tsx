import React from "react";
import { Globe, ExternalLink, Check, Copy, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DomainSubdomainCardProps } from "./types";

export const DomainSubdomainCard: React.FC<DomainSubdomainCardProps> = ({
  defaultSubdomain,
  copyToClipboard,
  copiedDnsKey,
}) => {
  return (
    <Card className="rounded-3xl border shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-bold">1. Subdomínio Padrão da EQSAM</CardTitle>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativo & Funcional
              </Badge>
              <Badge variant="outline" className="text-[11px] gap-1 text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/5">
                <ShieldCheck className="h-3 w-3 text-sky-500" /> SSL Ativo
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Endereço nativo disponibilizado pela infraestrutura. Funciona imediatamente sem necessidade de configurações de DNS.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/40 rounded-2xl border font-mono text-sm">
          <div className="flex items-center gap-2 truncate">
            <Globe className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="truncate font-semibold text-foreground select-all">{defaultSubdomain}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              asChild
              className="rounded-xl h-8 px-3 text-xs gap-1.5"
            >
              <a href={defaultSubdomain} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Abrir Site
              </a>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => copyToClipboard(defaultSubdomain, "subdomain")}
              className="rounded-xl h-8 px-3 text-xs gap-1.5"
            >
              {copiedDnsKey === "subdomain" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              Copiar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
