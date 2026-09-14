import React from "react";
import { Terminal, RefreshCw, Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEngineBadge, type LogDisplayMode } from "./types.ts";

export interface LogsHeaderProps {
  appName?: string | undefined;
  buildPack?: string | undefined;
  displayMode: LogDisplayMode;
  setDisplayMode: (mode: LogDisplayMode) => void;
  copied: boolean;
  handleCopyLogs: () => void;
  handleDownloadLogs: () => void;
  isLoading?: boolean | undefined;
  onRefresh?: (() => void) | undefined;
}

export function LogsHeader({
  appName = "Aplicação",
  buildPack,
  displayMode,
  setDisplayMode,
  copied,
  handleCopyLogs,
  handleDownloadLogs,
  isLoading = false,
  onRefresh,
}: LogsHeaderProps) {
  return (
    <div className="bg-zinc-900/90 backdrop-blur border-b border-zinc-800 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Lado Esquerdo: Botões de Janela e Título da Aplicação */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5 shrink-0">
          <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block border border-rose-600/40" />
          <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block border border-amber-600/40" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block border border-emerald-600/40" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-zinc-400" />
            {appName}
          </span>
          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-zinc-700 bg-zinc-800/60 text-zinc-400">
            {getEngineBadge(buildPack)}
          </Badge>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ao vivo
          </span>
        </div>
      </div>

      {/* Lado Direito: Modos de Visualização & Ações Rápidas */}
      <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
        {/* Alternador de Modo: Formatado vs Raw */}
        <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setDisplayMode("formatted")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              displayMode === "formatted"
                ? "bg-zinc-800 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Formatado
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("raw")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              displayMode === "raw"
                ? "bg-zinc-800 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Raw (Bruto)
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Copiar Logs */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyLogs}
            className="h-7 px-2 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5"
            title="Copiar logs para a área de transferência"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span className="hidden sm:inline">{copied ? "Copiado" : "Copiar"}</span>
          </Button>

          {/* Baixar Logs */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownloadLogs}
            className="h-7 px-2 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5"
            title="Baixar arquivo de logs completo"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Baixar</span>
          </Button>

          {/* Atualizar Manualmente */}
          {onRefresh && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-7 px-2 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5"
              title="Buscar novas saídas do container"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
