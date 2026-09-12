import React from "react";
import { CheckCircle2, XCircle, Loader2, Check, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface AppLiveDeployModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deployAppTitle?: string;
  appName?: string;
  deploymentStatus: "idle" | "in_progress" | "finished" | "failed" | "queued";
  deployStep: number;
  memoryLimit?: number;
  deploymentLogs: Array<{ output: string; type?: "stdout" | "stderr" }>;
  terminalLogsEndRef: React.RefObject<HTMLDivElement | null>;
  safeOnlineUrl?: string;
}

export function AppLiveDeployModal({
  open,
  onOpenChange,
  deployAppTitle,
  appName,
  deploymentStatus,
  deployStep,
  memoryLimit,
  deploymentLogs,
  terminalLogsEndRef,
  safeOnlineUrl,
}: AppLiveDeployModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-zinc-950 text-white border-zinc-800">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  {deploymentStatus === "finished" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : deploymentStatus === "failed" ? (
                    <XCircle className="h-5 w-5 text-rose-500" />
                  ) : (
                    <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                  )}
                  Deploy em Andamento: {deployAppTitle || appName || "Aplicação"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-zinc-400">
                Acompanhe o build e a publicação do seu container em tempo real no cluster DK1.
              </DialogDescription>
            </div>
            <div>
              {deploymentStatus === "finished" ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">Online 24/7</Badge>
              ) : deploymentStatus === "failed" ? (
                <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40">Falha no Build</Badge>
              ) : deploymentStatus === "queued" ? (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 animate-pulse">Na Fila...</Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse">Compilando...</Badge>
              )}
            </div>
          </div>

          {/* Stepper de Fases do Deploy */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-zinc-800 text-[11px]">
            <div className={`p-2 rounded-xl border flex flex-col gap-1 ${deployStep >= 1 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>
              <span className="font-bold flex items-center gap-1">
                {deployStep > 1 ? <Check className="h-3 w-3" /> : "1."} Recursos
              </span>
              <span className="text-[10px] opacity-80">{memoryLimit || 512}MB RAM</span>
            </div>
            <div className={`p-2 rounded-xl border flex flex-col gap-1 ${deployStep >= 2 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>
              <span className="font-bold flex items-center gap-1">
                {deployStep > 2 ? <Check className="h-3 w-3" /> : "2."} Repositório
              </span>
              <span className="text-[10px] opacity-80">Git / ZIP</span>
            </div>
            <div className={`p-2 rounded-xl border flex flex-col gap-1 ${deployStep >= 3 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>
              <span className="font-bold flex items-center gap-1">
                {deployStep > 3 ? <Check className="h-3 w-3" /> : "3."} Build Docker
              </span>
              <span className="text-[10px] opacity-80">Compilação</span>
            </div>
            <div className={`p-2 rounded-xl border flex flex-col gap-1 ${deployStep >= 4 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>
              <span className="font-bold flex items-center gap-1">
                {deployStep >= 4 ? <Check className="h-3 w-3" /> : "4."} SSL / Online
              </span>
              <span className="text-[10px] opacity-80">Let's Encrypt</span>
            </div>
          </div>
        </DialogHeader>

        {/* Terminal de Logs do Deploy */}
        <div className="flex-1 bg-black p-4 font-mono text-xs overflow-y-auto max-h-[360px] space-y-1">
          {deploymentLogs.length === 0 && (
            <div className="text-zinc-500 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Conectando ao daemon de build do cluster...
            </div>
          )}
          {deploymentLogs.map((log, index) => (
            <div 
              key={index} 
              className={`leading-relaxed whitespace-pre-wrap ${log.type === "stderr" ? "text-rose-400" : "text-emerald-400"}`}
            >
              {log.output}
            </div>
          ))}
          <div ref={terminalLogsEndRef} />
        </div>

        {/* Footer com Ações */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            {deploymentStatus === "finished" ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Container pronto e respondendo requisições!
              </span>
            ) : deploymentStatus === "failed" ? (
              <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                <XCircle className="h-4 w-4" /> Build interrompido com erros.
              </span>
            ) : (
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" /> Compilando dependências e iniciando processo...
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {deploymentStatus === "finished" && safeOnlineUrl && (
              <Button asChild size="sm" className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <a href={safeOnlineUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Acessar Aplicação Online
                </a>
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              {deploymentStatus === "finished" ? "Concluir" : "Fechar Modal (Manter em 2º plano)"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
