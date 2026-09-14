import React from "react";
import type { LogLevel } from "./types.ts";

export interface LogsFooterProps {
  filteredCount: number;
  totalCount: number;
  levelFilter: LogLevel;
  autoScroll: boolean;
  setAutoScroll: (scroll: boolean) => void;
}

export function LogsFooter({
  filteredCount,
  totalCount,
  levelFilter,
  autoScroll,
  setAutoScroll,
}: LogsFooterProps) {
  return (
    <div className="bg-zinc-900/70 border-t border-zinc-800 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
      <div className="flex items-center gap-3">
        <span>
          Exibindo <strong className="text-zinc-300">{filteredCount}</strong> de{" "}
          <strong className="text-zinc-300">{totalCount}</strong> eventos
        </span>
        {levelFilter !== "all" && (
          <span className="text-zinc-400">
            (Filtro: <strong className="uppercase">{levelFilter}</strong>)
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400 hover:text-zinc-200 select-none">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0 h-3 w-3"
          />
          <span>Auto-Rolagem</span>
        </label>

        <span className="text-zinc-600">•</span>
        <span>Docker Swarm Stream</span>
      </div>
    </div>
  );
}
