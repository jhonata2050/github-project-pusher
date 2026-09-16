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
}) => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="rounded-3xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="size-5 text-primary" /> Conexão do Banco de Dados (.env)
          </CardTitle>
          <CardDescription>
            Conexão blindada contra exposição. As credenciais residem exclusivamente nas variáveis de ambiente do contêiner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status da Instância</label>
            <div className="flex items-center gap-2">
              <Badge variant={config?.isConnected ? "default" : "destructive"} className="rounded-lg">
                {config?.isConnected ? "Conectado e Ativo (.env)" : "Não configurado"}
              </Badge>
              <Badge variant="outline" className="rounded-lg text-xs">
                Exclusivo Docker Environment
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Chave de Serviço (Service Role)</label>
            <div className="flex items-center gap-2">
              <Badge variant={config?.hasServiceRole ? "default" : "secondary"} className="rounded-lg">
                {config?.hasServiceRole ? "Protegida no Backend (.env)" : "Não configurada"}
              </Badge>
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-2xl border text-xs text-muted-foreground leading-relaxed">
            🔒 <strong>Blindagem de Segurança:</strong> As chaves de acesso, tokens e URLs de conexão com o banco de dados não são transmitidas nem expostas para o frontend do painel por diretriz de segurança estrita.
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
