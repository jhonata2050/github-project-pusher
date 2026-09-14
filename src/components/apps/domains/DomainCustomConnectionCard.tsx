import React from "react";
import {
  Globe,
  ExternalLink,
  CheckCircle2,
  Lock,
  RefreshCw,
  Wifi,
  RotateCcw,
  Info,
  Save,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { DomainCustomConnectionCardProps } from "./types";

export const DomainCustomConnectionCard: React.FC<DomainCustomConnectionCardProps> = ({
  hasCustomDomain,
  activeCustomDomain,
  customDomainInput,
  setCustomDomainInput,
  userDomains,
  isVerifyingDns,
  verifyDnsMutation,
  saveDomainMutation,
  resetDomainMutation,
}) => {
  return (
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
                {userDomains.map((d) => (
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
  );
};
