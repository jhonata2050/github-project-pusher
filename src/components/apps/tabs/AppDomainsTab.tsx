import React from "react";
import {
  Globe,
  ExternalLink,
  Check,
  Copy,
  CheckCircle2,
  Lock,
  RefreshCw,
  Wifi,
  RotateCcw,
  Info,
  Save,
  AlertTriangle,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface AppDomainsTabProps {
  defaultSubdomain: string;
  cleanDefaultSubdomainHost: string;
  hasCustomDomain: boolean;
  activeCustomDomain: string;
  customDomainInput: string;
  setCustomDomainInput: (val: string) => void;
  userDomains: any[];
  isVerifyingDns: boolean;
  verifyDnsMutation: any;
  saveDomainMutation: any;
  resetDomainMutation: any;
  dnsCheckResult: any;
  copyToClipboard: (text: string, key: string) => void;
  copiedDnsKey: string | null;
}

export function AppDomainsTab({
  defaultSubdomain,
  cleanDefaultSubdomainHost,
  hasCustomDomain,
  activeCustomDomain,
  customDomainInput,
  setCustomDomainInput,
  userDomains,
  isVerifyingDns,
  verifyDnsMutation,
  saveDomainMutation,
  resetDomainMutation,
  dnsCheckResult,
  copyToClipboard,
  copiedDnsKey,
}: AppDomainsTabProps) {
  return (
    <div className="space-y-6">
      {/* Header explicativo da aba */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-brand/5 to-transparent border border-emerald-500/20 p-5 sm:p-6 rounded-3xl space-y-2">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-base">
          <Globe className="h-5 w-5 text-emerald-500" />
          <span>Gerenciamento de Domínio & Conexão Web</span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Para que seus visitantes acessem sua aplicação, ela possui um <strong>subdomínio padrão gratuito</strong> da EQSAM Cloud que já está funcionando. 
          Se você possui um <strong>domínio próprio registrado</strong> (como <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">seusite.com.br</code>), conecte-o abaixo para que nosso cluster reconheça suas requisições e gere o Certificado SSL de segurança automaticamente.
        </p>
      </div>

      {/* CARD 1: SUBDOMÍNIO PADRÃO DO SISTEMA */}
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

      {/* CARD 2: CONECTAR DOMÍNIO PERSONALIZADO */}
      <Card className="rounded-3xl border shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-bold">2. Conectar Seu Domínio Personalizado</CardTitle>
                {hasCustomDomain && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Vinculado ao Sistema
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                Informe qual o seu domínio para que o sistema saiba que os acessos a ele devem abrir esta aplicação.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Se já tiver domínio personalizado conectado */}
          {hasCustomDomain ? (
            <div className="bg-emerald-500/5 border border-emerald-500/25 p-4 sm:p-5 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-bold text-foreground">
                        https://{activeCustomDomain}
                      </span>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                        SSL HTTPS Ativo
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      O cluster EQSAM está configurado para receber requisições deste domínio.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    asChild
                    className="rounded-xl h-8 px-3 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <a href={`https://${activeCustomDomain}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Visitar Domínio
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifyDnsMutation.mutate(activeCustomDomain)}
                    disabled={isVerifyingDns}
                    className="rounded-xl h-8 px-3 text-xs gap-1.5 font-semibold"
                  >
                    {isVerifyingDns ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5 text-primary" />}
                    Testar DNS
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resetDomainMutation.mutate()}
                    disabled={resetDomainMutation.isPending}
                    className="rounded-xl h-8 px-3 text-xs gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Voltar ao Padrão
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 border p-4 rounded-2xl space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span><strong>Por que adicionar seu domínio aqui?</strong> Nosso balanceador de carga inteligente (Traefik) precisa saber exatamente o nome do seu domínio para rotear o tráfego da internet até este container e emitir a chave criptográfica SSL Let's Encrypt para seu endereço.</span>
              </p>
            </div>
          )}

          {/* Formulário de Adicionar / Alterar Domínio */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                {hasCustomDomain ? "Alterar Domínio Personalizado" : "Digite seu Domínio Próprio"}
              </Label>
              <span className="text-[11px] text-muted-foreground">Ex: meusite.com.br ou app.meusite.com</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground select-none pointer-events-none">
                  https://
                </div>
                <Input
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  placeholder="meusite.com.br ou app.meusite.com"
                  className="rounded-xl font-mono text-sm pl-20"
                />
              </div>
              <Button 
                onClick={() => saveDomainMutation.mutate(customDomainInput)}
                disabled={saveDomainMutation.isPending || !customDomainInput.trim()}
                className="rounded-xl gap-2 font-bold px-5 bg-primary text-primary-foreground shadow-sm shrink-0"
              >
                {saveDomainMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar e Conectar Domínio
              </Button>
            </div>

            {/* Atalho de Domínios da Conta */}
            {userDomains && userDomains.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] text-muted-foreground block mb-1.5">
                  Domínios registrados na sua conta EQSAM:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {userDomains.map((d: any) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setCustomDomainInput(d.domain_name);
                        toast.info(`Domínio ${d.domain_name} selecionado! Clique em 'Salvar e Conectar Domínio'.`);
                      }}
                      className="text-xs font-mono px-2.5 py-1 rounded-lg border bg-background hover:bg-muted text-foreground transition-colors flex items-center gap-1"
                    >
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      {d.domain_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: PASSO A PASSO DE APONTAMENTO DNS */}
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
    </div>
  );
}
