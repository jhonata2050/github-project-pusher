import React from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { extractAppHash12 } from "@/lib/app-subdomain";

interface TypebotEndpointsSectionProps {
  app: any;
  safeOnlineUrl: string;
  copyToClipboard: (text: string, key?: string) => void;
}

export function TypebotEndpointsSection({
  app,
  safeOnlineUrl,
  copyToClipboard,
}: TypebotEndpointsSectionProps) {
  const cleanAppHash = extractAppHash12(app.id || (app as any).service_id);
  const viewerUrl = `http://viewer-${cleanAppHash}.dk1.eqsam.com`;

  return (
    <>
      {/* Typebot Builder */}
      <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              Typebot Builder (Editor Visual & Fluxos)
            </span>
            <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
              Porta 3000
            </Badge>
            <span className="text-[11px] text-muted-foreground">Painel de Criação</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-primary font-semibold bg-primary/10 px-2.5 py-1 rounded-lg break-all">
              {app.fqdn}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs gap-1.5"
            onClick={() => copyToClipboard(app.fqdn)}
          >
            <Copy className="h-3.5 w-3.5" /> Copiar URL
          </Button>
          <Button
            size="sm"
            asChild
            className="h-8 rounded-xl text-xs gap-1.5 bg-primary font-bold shadow-sm"
          >
            <a href={safeOnlineUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Acessar Builder
            </a>
          </Button>
        </div>
      </div>

      {/* Typebot Viewer */}
      <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              Typebot Viewer (Chatbot Público & Embed)
            </span>
            <Badge
              variant="outline"
              className="font-mono text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            >
              Porta 3001
            </Badge>
            <span className="text-[11px] text-muted-foreground">Chatbot de Atendimento</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-lg break-all">
              {viewerUrl}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs gap-1.5"
            onClick={() => copyToClipboard(viewerUrl)}
          >
            <Copy className="h-3.5 w-3.5" /> Copiar URL
          </Button>
          <Button
            size="sm"
            asChild
            className="h-8 rounded-xl text-xs gap-1.5 bg-primary font-bold shadow-sm"
          >
            <a href={viewerUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Acessar Chatbot
            </a>
          </Button>
        </div>
      </div>
    </>
  );
}
