import React from "react";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface AppPendingEnvsAlertProps {
  pendingEnvs: Array<{ key: string; value: string }>;
  setActiveTab: (tab: string) => void;
}

export function AppPendingEnvsAlert({
  pendingEnvs,
  setActiveTab,
}: AppPendingEnvsAlertProps) {
  if (!pendingEnvs || pendingEnvs.length === 0) return null;

  return (
    <div className="p-5 sm:p-6 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent text-amber-950 dark:text-amber-100 shadow-lg shadow-amber-500/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 shadow-sm ring-1 ring-amber-500/30">
            <KeyRound className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-base md:text-lg tracking-tight">
                Configuração Obrigatória Pendente: Credenciais do Serviço
              </h4>
              <Badge variant="outline" className="bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5">
                Ação Requerida
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Este serviço possui variáveis obrigatórias com valores de exemplo (ex: chaves de autenticação ou envio de e-mail). 
              Para conseguir acessar o painel administrativo ou operar o serviço com sucesso, <strong>insira suas credenciais reais na aba Variáveis e reinicie a aplicação</strong>.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-muted-foreground">Variáveis a configurar:</span>
              {pendingEnvs.map((env) => (
                <span
                  key={env.key}
                  className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 shadow-xs"
                >
                  <KeyRound className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  {env.key}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0 w-full sm:w-auto">
          <Button
            size="sm"
            className="w-full sm:w-auto font-bold rounded-xl gap-2 shadow-md bg-amber-500 hover:bg-amber-600 text-white h-10 px-4"
            onClick={() => setActiveTab("envs")}
          >
            <KeyRound className="h-4 w-4" /> Configurar Variáveis e Reiniciar
          </Button>
        </div>
      </div>
    </div>
  );
}
