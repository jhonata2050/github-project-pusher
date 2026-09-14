import React from "react";
import {
  Check,
  Copy,
  CheckCircle2,
  RefreshCw,
  Wifi,
  AlertTriangle,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DomainDnsInstructionsCardProps } from "./types";

export const DomainDnsInstructionsCard: React.FC<DomainDnsInstructionsCardProps> = ({
  cleanDefaultSubdomainHost,
  customDomainInput,
  activeCustomDomain,
  isVerifyingDns,
  verifyDnsMutation,
  dnsCheckResult,
  copyToClipboard,
  copiedDnsKey,
}) => {
  return (
    <Card className="rounded-3xl border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-bold">3. Como Fazer o Apontamento DNS no Seu Provedor</CardTitle>
        </div>
        <CardDescription className="text-xs leading-relaxed">
          Acesse a <strong>Zona DNS</strong> onde seu domínio está registrado (ex: Registro.br, Cloudflare, GoDaddy ou EQSAM) e configure um dos registros abaixo:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opção A: CNAME */}
          <div className="p-4 rounded-2xl border bg-card/60 hover:border-emerald-500/40 transition-colors space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                  Recomendado
                </Badge>
                <span className="text-xs font-bold">Opção A: Subdomínio ou WWW</span>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">CNAME</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Use esta opção para apontar <code className="font-mono text-foreground">www.seusite.com</code> ou um subdomínio como <code className="font-mono text-foreground">app.seusite.com</code>:
            </p>
            <div className="space-y-2 bg-muted/40 p-3 rounded-xl text-xs font-mono border">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[10px]">TIPO:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">CNAME</span>
                  <button onClick={() => copyToClipboard("CNAME", "cname-type")} className="text-muted-foreground hover:text-foreground">
                    {copiedDnsKey === "cname-type" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-1.5">
                <span className="text-muted-foreground text-[10px]">NOME / HOST:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">www <span className="text-muted-foreground font-normal">(ou subdomínio)</span></span>
                  <button onClick={() => copyToClipboard("www", "cname-host")} className="text-muted-foreground hover:text-foreground">
                    {copiedDnsKey === "cname-host" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-1.5">
                <span className="text-muted-foreground text-[10px]">DESTINO / VALOR:</span>
                <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate">{cleanDefaultSubdomainHost}</span>
                  <button onClick={() => copyToClipboard(cleanDefaultSubdomainHost, "cname-val")} className="text-muted-foreground hover:text-foreground shrink-0">
                    {copiedDnsKey === "cname-val" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Opção B: TIPO A */}
          <div className="p-4 rounded-2xl border bg-card/60 hover:border-emerald-500/40 transition-colors space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Opção B: Domínio Principal / Raiz</span>
              <Badge variant="outline" className="font-mono text-[10px]">TIPO A</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Use esta opção para apontar a raiz <code className="font-mono text-foreground">seusite.com.br</code> diretamente ao cluster:
            </p>
            <div className="space-y-2 bg-muted/40 p-3 rounded-xl text-xs font-mono border">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[10px]">TIPO:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">A</span>
                  <button onClick={() => copyToClipboard("A", "a-type")} className="text-muted-foreground hover:text-foreground">
                    {copiedDnsKey === "a-type" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-1.5">
                <span className="text-muted-foreground text-[10px]">NOME / HOST:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">@ <span className="text-muted-foreground font-normal">(ou deixe em branco)</span></span>
                  <button onClick={() => copyToClipboard("@", "a-host")} className="text-muted-foreground hover:text-foreground">
                    {copiedDnsKey === "a-host" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-1.5">
                <span className="text-muted-foreground text-[10px]">DESTINO / IP:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">45.159.172.137</span>
                  <button onClick={() => copyToClipboard("45.159.172.137", "a-val")} className="text-muted-foreground hover:text-foreground">
                    {copiedDnsKey === "a-val" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DIAGNÓSTICO EM TEMPO REAL DE DNS */}
        <div className="pt-2">
          <div className="p-4 rounded-2xl border bg-muted/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5 text-primary" /> Verificador de Apontamento DNS em Tempo Real
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Teste se o seu provedor de domínio já propagou o apontamento para o cluster EQSAM.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => verifyDnsMutation.mutate(customDomainInput || activeCustomDomain)}
                disabled={isVerifyingDns || (!customDomainInput && !activeCustomDomain)}
                className="rounded-xl h-8 text-xs gap-1.5 font-semibold shrink-0"
              >
                {isVerifyingDns ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verificando DNS...
                  </>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5" /> Testar Apontamento Agora
                  </>
                )}
              </Button>
            </div>

            {/* Exibição do Resultado do DNS */}
            {dnsCheckResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                dnsCheckResult.isConfigured 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" 
                  : dnsCheckResult.status === "wrong_ip"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                  : "bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300"
              }`}>
                {dnsCheckResult.isConfigured ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : dnsCheckResult.status === "wrong_ip" ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{dnsCheckResult.message}</p>
                  {dnsCheckResult.aRecords && dnsCheckResult.aRecords.length > 0 && (
                    <p className="text-[11px] opacity-80 font-mono">
                      IPs encontrados: [{dnsCheckResult.aRecords.join(", ")}] | IP esperado: 45.159.172.137
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bloco informativo de SSL Let's Encrypt */}
        <div className="bg-muted/40 p-4 rounded-2xl border space-y-2 text-xs">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-lime-500" /> Certificado SSL Let's Encrypt 100% Automático
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Você não precisa gerar CSR, instalar arquivos de certificado ou pagar nada a mais. Assim que seu apontamento DNS for propagado (normalmente entre 5 e 30 minutos), nosso proxy reverso emite e renova o certificado SSL HTTPS de 256 bits de forma totalmente automatizada.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
