import React from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { extractAppHash12, calculateDatabasePort } from "@/lib/app-subdomain";

interface DatabaseEndpointsSectionProps {
  app: any;
  copyToClipboard: (text: string, key?: string) => void;
}

export function DatabaseEndpointsSection({
  app,
  copyToClipboard,
}: DatabaseEndpointsSectionProps) {
  const cleanAppHash = extractAppHash12(app.id || (app as any).service_id);
  const dbType = app.template_id.includes("postgres")
    ? "postgres"
    : app.template_id.includes("mysql")
    ? "mysql"
    : "redis";
  const dbPort = calculateDatabasePort(cleanAppHash, dbType);
  const hostIp = "45.159.172.137";
  const connUri =
    dbType === "postgres"
      ? `postgresql://postgres:eqsam_pg_${cleanAppHash}@${hostIp}:${dbPort}/main`
      : dbType === "mysql"
      ? `mysql://dbuser:eqsam_mysql_${cleanAppHash}@${hostIp}:${dbPort}/main`
      : `redis://:eqsam_redis_${cleanAppHash}@${hostIp}:${dbPort}`;
  const adminWebUrl = `http://admin-${cleanAppHash}.dk1.eqsam.com`;

  return (
    <>
      {/* Porta Direta TCP do Banco */}
      <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              Conexão Direta TCP (Driver / CLI / Externo)
            </span>
            <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
              Porta {dbPort}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {hostIp}:{dbPort}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-primary font-semibold bg-primary/10 px-2.5 py-1 rounded-lg break-all">
              {connUri}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs gap-1.5"
            onClick={() => copyToClipboard(connUri)}
          >
            <Copy className="h-3.5 w-3.5" /> Copiar String de Conexão
          </Button>
        </div>
      </div>

      {/* Painel Web (Adminer / Redis Commander) */}
      <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              {dbType === "redis" ? "Redis Commander (Web UI)" : "Adminer SQL (Web UI)"}
            </span>
            <Badge
              variant="outline"
              className="font-mono text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            >
              Porta 8080 • Web
            </Badge>
            <span className="text-[11px] text-muted-foreground">Gerenciador Web Embutido</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-lg break-all">
              {adminWebUrl}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs gap-1.5"
            onClick={() => copyToClipboard(adminWebUrl)}
          >
            <Copy className="h-3.5 w-3.5" /> Copiar URL
          </Button>
          <Button
            size="sm"
            asChild
            className="h-8 rounded-xl text-xs gap-1.5 bg-primary font-bold shadow-sm"
          >
            <a href={adminWebUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Acessar Web UI
            </a>
          </Button>
        </div>
      </div>
    </>
  );
}
