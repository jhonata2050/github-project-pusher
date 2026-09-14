import React from "react";
import { Shield, Layers, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DatabaseConnectionTabProps } from "./types";

const SYSTEM_TABLES = [
  "profiles",
  "user_roles",
  "servers",
  "product_groups",
  "products",
  "services",
  "vps_instances",
  "invoices",
  "invoice_items",
  "coupons",
  "domains",
  "tickets",
  "audit_logs",
  "email_logs",
];

export const DatabaseConnectionTab: React.FC<DatabaseConnectionTabProps> = ({
  config,
  copiedKey,
  onCopy,
}) => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="rounded-3xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="size-5 text-primary" /> Configuração Supabase
          </CardTitle>
          <CardDescription>Dados de endpoint e chaves da instância conectada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">URL do Projeto</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-xl bg-muted p-2.5 font-mono text-xs select-all">
                {config?.url || "Carregando..."}
              </code>
              {config?.url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl size-9"
                  onClick={() => onCopy(config.url!, "url")}
                >
                  {copiedKey === "url" ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Chave Pública (Anon/Publishable)</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-xl bg-muted p-2.5 font-mono text-xs">
                {config?.publishableKey || "Carregando..."}
              </code>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Chave de Serviço (Service Role)</label>
            <div className="flex items-center gap-2">
              <Badge variant={config?.hasServiceRole ? "default" : "secondary"} className="rounded-lg">
                {config?.hasServiceRole ? "Configurada (.env)" : "Opcional / Não configurada"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="size-5 text-primary" /> Estrutura & Schemas
          </CardTitle>
          <CardDescription>Tabelas gerenciadas automaticamente pelo sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            O Hosting Hub Pro gerencia automaticamente mais de 20 tabelas com integridade relacional e Row Level Security (RLS).
          </p>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {SYSTEM_TABLES.map((t) => (
              <Badge key={t} variant="outline" className="text-[11px] rounded-lg">
                {t}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
