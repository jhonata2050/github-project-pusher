import React from "react";
import { Database, Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DatabaseEndpointsSection,
  TypebotEndpointsSection,
  OpenStatusEndpointsSection,
  StandardEndpointsSection,
  type AppConnectionEndpointsCardProps,
} from "./endpoints";

export function AppConnectionEndpointsCard({
  app,
  safeOnlineUrl,
  pendingEnvs,
  setActiveTab,
  copyToClipboard,
}: AppConnectionEndpointsCardProps) {
  const isDatabase =
    app.template_id?.includes("postgres") ||
    app.template_id?.includes("mysql") ||
    app.template_id?.includes("redis");

  return (
    <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
      <CardHeader className="bg-muted/20 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isDatabase ? (
                <Database className="h-5 w-5 text-primary" />
              ) : (
                <Globe className="h-5 w-5 text-primary" />
              )}
              <CardTitle className="text-base font-bold">
                {isDatabase
                  ? "Conexões & Painel Web do Banco de Dados"
                  : app.template_id?.includes("typebot")
                  ? "Portas & Endpoints do Cluster Typebot"
                  : "Portas & Endpoints Públicos"}
              </CardTitle>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold"
              >
                Cluster DK1 • Traefik Ingress
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Roteamento multi-porta inteligente com portas dedicadas e proxy reverso de alta performance.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 divide-y divide-border/60">
        {isDatabase ? (
          <DatabaseEndpointsSection app={app} copyToClipboard={copyToClipboard} />
        ) : app.template_id?.includes("typebot") ? (
          <TypebotEndpointsSection
            app={app}
            safeOnlineUrl={safeOnlineUrl}
            copyToClipboard={copyToClipboard}
          />
        ) : app.template_id?.includes("openstatus") ? (
          <OpenStatusEndpointsSection
            app={app}
            safeOnlineUrl={safeOnlineUrl}
            pendingEnvs={pendingEnvs}
            setActiveTab={setActiveTab}
            copyToClipboard={copyToClipboard}
          />
        ) : (
          <StandardEndpointsSection
            app={app}
            safeOnlineUrl={safeOnlineUrl}
            copyToClipboard={copyToClipboard}
          />
        )}
      </CardContent>
    </Card>
  );
}
