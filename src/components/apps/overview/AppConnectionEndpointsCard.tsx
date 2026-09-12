import React from "react";
import { Database, Globe, Copy, ExternalLink, ShieldCheck, KeyRound } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { extractAppHash12, calculateDatabasePort } from "@/lib/app-subdomain";

export interface AppConnectionEndpointsCardProps {
  app: any;
  safeOnlineUrl: string;
  pendingEnvs: any[];
  setActiveTab: (tab: string) => void;
  copyToClipboard: (text: string, key?: string) => void;
}

export function AppConnectionEndpointsCard({
  app,
  safeOnlineUrl,
  pendingEnvs,
  setActiveTab,
  copyToClipboard,
}: AppConnectionEndpointsCardProps) {
  const isDatabase = app.template_id?.includes("postgres") || app.template_id?.includes("mysql") || app.template_id?.includes("redis");

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
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
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
        {/* CASO 1: BANCOS DE DADOS STANDALONE */}
        {isDatabase ? (
          (() => {
            const cleanAppHash = extractAppHash12(app.id || (app as any).service_id);
            const dbType = app.template_id.includes("postgres") ? "postgres" : app.template_id.includes("mysql") ? "mysql" : "redis";
            const dbPort = calculateDatabasePort(cleanAppHash, dbType);
            const hostIp = "45.159.172.137";
            const connUri = dbType === "postgres"
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
                      <span className="text-xs font-bold text-foreground">Conexão Direta TCP (Driver / CLI / Externo)</span>
                      <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
                        Porta {dbPort}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{hostIp}:{dbPort}</span>
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
                      <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
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
          })()
        ) : app.template_id?.includes("typebot") ? (
          (() => {
            const cleanAppHash = extractAppHash12(app.id || (app as any).service_id);
            const viewerUrl = `http://viewer-${cleanAppHash}.dk1.eqsam.com`;

            return (
              <>
                {/* Typebot Builder */}
                <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Typebot Builder (Editor Visual & Fluxos)</span>
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
                      <span className="text-xs font-bold text-foreground">Typebot Viewer (Chatbot Público & Embed)</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
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
          })()
        ) : app.template_id?.includes("openstatus") ? (
          (() => {
            const cleanAppHash = extractAppHash12(app.id || (app as any).service_id);
            const adminDashboardUrl = `https://admin-openstatus-${cleanAppHash}.dk1.eqsam.com`;

            return (
              <>
                {/* Página de Status Pública */}
                <div className="py-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Página de Status (Pública)</span>
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
                      <span className="text-xs font-bold text-foreground">Dashboard Administrativo (Admin)</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
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

                <div className={`p-3.5 rounded-2xl border text-[11px] space-y-2 ${
                  pendingEnvs.some((e) => e.key === "RESEND_API_KEY")
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200"
                    : "bg-muted/40 border text-muted-foreground"
                }`}>
                  <div className="font-semibold text-foreground flex items-center justify-between gap-1.5 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Credenciais e Autenticação do Dashboard
                    </span>
                    {pendingEnvs.some((e) => e.key === "RESEND_API_KEY") && (
                      <Badge variant="outline" className="text-[9px] font-extrabold uppercase text-amber-700 dark:text-amber-300 border-amber-500/50 bg-amber-500/20">
                        Chave Resend Pendente
                      </Badge>
                    )}
                  </div>
                  <p className="leading-relaxed">
                    Usuário inicial provisionado: <code className="font-mono font-bold text-foreground">ping@openstatus.dev</code>. O OpenStatus opera com Magic Links (NextAuth).
                    {pendingEnvs.some((e) => e.key === "RESEND_API_KEY") ? (
                      <span className="block mt-1.5 font-medium text-amber-800 dark:text-amber-300">
                        ⚠️ <strong>Atenção:</strong> Sua chave <code className="font-mono font-bold bg-amber-500/20 px-1 py-0.5 rounded">RESEND_API_KEY</code> ainda está com o valor temporário de exemplo. O envio do Magic Link para autenticação no painel falhará até que você cadastre sua chave real do Resend na aba <strong>Variáveis</strong> e reinicie a aplicação.
                      </span>
                    ) : (
                      <span> Para envio de links de login por e-mail em produção, cadastre sua chave gratuita <code className="font-mono text-primary font-semibold">RESEND_API_KEY</code> na aba <strong>Variáveis</strong> acima.</span>
                    )}
                  </p>
                  {pendingEnvs.some((e) => e.key === "RESEND_API_KEY") && (
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
          })()
        ) : (
          <>
            {/* Endpoint Principal Web */}
            <div className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Porta Principal (Web)</span>
                  <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
                    Porta {app.template_id?.includes("wordpress") ? 80 : app.template_id?.includes("evolution") ? 8080 : app.template_id?.includes("kuma") ? 3001 : app.template_id?.includes("n8n") ? 5678 : 3000}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
