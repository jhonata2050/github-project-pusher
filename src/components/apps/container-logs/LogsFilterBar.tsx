import React from "react";
import { Search, WrapText } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { LogLevel } from "./types.ts";

export interface LogsFilterBarProps {
  levelFilter: LogLevel;
  setLevelFilter: (level: LogLevel) => void;
  levelCounts: Record<LogLevel, number>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  wrapLines: boolean;
  setWrapLines: (wrap: boolean) => void;
}

export function LogsFilterBar({
  levelFilter,
  setLevelFilter,
  levelCounts,
  searchQuery,
  setSearchQuery,
  wrapLines,
  setWrapLines,
}: LogsFilterBarProps) {
  return (
    <div className="bg-zinc-950/80 border-b border-zinc-800/80 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
      {/* Filtros de Nível */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-zinc-500 font-mono mr-1">Filtrar:</span>
        <button
          type="button"
          onClick={() => setLevelFilter("all")}
          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
            levelFilter === "all"
              ? "bg-zinc-800 text-white font-bold border border-zinc-700"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Todos ({levelCounts.all})
        </button>
        <button
          type="button"
          onClick={() => setLevelFilter("info")}
          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
            levelFilter === "info"
              ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
              : "text-emerald-500/70 hover:text-emerald-400"
          }`}
        >
          Info ({levelCounts.info})
        </button>
        {levelCounts.warn > 0 && (
          <button
            type="button"
            onClick={() => setLevelFilter("warn")}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
              levelFilter === "warn"
                ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                : "text-amber-500/70 hover:text-amber-400"
            }`}
          >
            Avisos ({levelCounts.warn})
          </button>
        )}
        {levelCounts.error > 0 && (
          <button
            type="button"
            onClick={() => setLevelFilter("error")}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
              levelFilter === "error"
                ? "bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30"
                : "text-rose-500/70 hover:text-rose-400"
            }`}
          >
            Erros ({levelCounts.error})
          </button>
        )}
      </div>

      {/* Campo de Busca em Tempo Real */}
      <div className="flex items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
          <Input
            placeholder="Buscar nos logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs bg-zinc-900 border-zinc-800 pl-7 pr-7 text-zinc-200 placeholder:text-zinc-600 rounded-lg focus-visible:ring-1 focus-visible:ring-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-[11px] font-mono"
            >
              ✕
            </button>
          )}
        </div>

        {/* Toggle Quebra de Linha */}
        <button
          type="button"
          onClick={() => setWrapLines(!wrapLines)}
          className={`p-1.5 rounded-lg border text-xs transition-colors ${
            wrapLines ? "bg-zinc-800 text-zinc-200 border-zinc-700" : "text-zinc-500 border-zinc-800 hover:text-zinc-300"
          }`}
          title={wrapLines ? "Quebra de linha ativa" : "Quebra de linha desativada"}
        >
          <WrapText className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
