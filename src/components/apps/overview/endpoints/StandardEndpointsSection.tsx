import React from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StandardEndpointsSectionProps {
  app: any;
  safeOnlineUrl: string;
  copyToClipboard: (text: string, key?: string) => void;
}

export function StandardEndpointsSection({
  app,
  safeOnlineUrl,
  copyToClipboard,
}: StandardEndpointsSectionProps) {
  const port = app.template_id?.includes("wordpress")
    ? 80
    : app.template_id?.includes("evolution")
    ? 8080
    : app.template_id?.includes("kuma")
    ? 3001
    : app.template_id?.includes("n8n")
    ? 5678
    : 3000;

  return (
    <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">Porta Principal (Web)</span>
          <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
            Porta {port}
          </Badge>
          <span className="text-[11px] text-muted-foreground">HTTP / HTTPS</span>
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
            <ExternalLink className="h-3.5 w-3.5" /> Acessar
          </a>
        </Button>
      </div>
    </div>
  );
}
