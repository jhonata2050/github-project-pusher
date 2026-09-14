import React from "react";
import { Terminal } from "lucide-react";
import type { ParsedLogLine, LogDisplayMode } from "./types.ts";

export interface LogsTerminalBodyProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  filteredLines: ParsedLogLine[];
  displayMode: LogDisplayMode;
  wrapLines: boolean;
  searchQuery: string;
}

export function LogsTerminalBody({
  containerRef,
  filteredLines,
  displayMode,
  wrapLines,
  searchQuery,
}: LogsTerminalBodyProps) {
  return (
    <div
      ref={containerRef}
      className={`p-4 font-mono text-xs overflow-y-auto max-h-[520px] min-h-[300px] leading-relaxed select-text ${
        wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
      }`}
    >
      {filteredLines.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-2 font-mono">
          <Terminal className="h-8 w-8 text-zinc-700 stroke-[1.5]" />
          <p className="text-sm font-medium text-zinc-400">
            {searchQuery ? "Nenhum log corresponde ao filtro de busca." : "Aguardando novas saídas do container..."}
          </p>
          <p className="text-xs text-zinc-600">
            As saídas stdout e stderr do serviço aparecerão aqui automaticamente.
          </p>
        </div>
      ) : displayMode === "formatted" ? (
        <div className="space-y-1.5">
          {filteredLines.map((line) => {
            const isError = line.level === "error";
            const isWarn = line.level === "warn";
            const isDebug = line.level === "debug";

            return (
              <div
                key={line.id}
                className={`group flex items-start gap-2.5 py-1 px-2 rounded-lg transition-colors ${
                  isError
                    ? "bg-rose-950/25 border-l-2 border-rose-500 text-rose-200"
                    : isWarn
                    ? "bg-amber-950/20 border-l-2 border-amber-500 text-amber-200"
                    : isDebug
                    ? "hover:bg-zinc-900/40 text-cyan-300"
                    : "hover:bg-zinc-900/60 text-zinc-300"
                }`}
              >
                {/* Número da Linha */}
                <span className="text-[10px] text-zinc-600 select-none shrink-0 w-7 text-right font-mono pt-0.5">
                  {line.index}
                </span>

                {/* Timestamp */}
                <span className="text-[11px] text-zinc-500 select-none shrink-0 font-mono pt-0.5">
                  {line.timestamp}
                </span>

                {/* Badge de Nível */}
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded font-mono shrink-0 select-none ${
                    isError
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : isWarn
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : isDebug
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                  }`}
                >
                  {line.level}
                </span>

                {/* Mensagem Principal */}
                <div className="flex-1 min-w-0 font-mono leading-relaxed">
                  <span className={isError ? "text-rose-100 font-semibold" : isWarn ? "text-amber-100 font-medium" : "text-zinc-200"}>
                    {line.message}
                  </span>

                  {/* Metadados / Atributos adicionais do JSON (ex: logger=tls, storage=...) */}
                  {line.meta && Object.keys(line.meta).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {Object.entries(line.meta).map(([key, value]) => {
                        const valStr = typeof value === "object" ? JSON.stringify(value) : String(value);
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400"
                          >
                            <span className="text-zinc-500 font-medium">{key}:</span>
                            <span className="text-zinc-300 truncate max-w-xs" title={valStr}>
                              {valStr}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Origem Swarm (Task / Node) */}
                {line.source && (
                  <span className="text-[10px] text-zinc-600 shrink-0 font-mono hidden md:inline-block pt-0.5" title={`Origem no Cluster: ${line.source}`}>
                    {line.source}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* MODO RAW (BRUTO) */
        <div className="space-y-0.5 text-emerald-400/90 font-mono text-xs selection:bg-emerald-900 selection:text-white">
          {filteredLines.map((line) => (
            <div key={line.id} className="hover:bg-zinc-900/50 py-0.5 px-1 rounded flex gap-3">
              <span className="text-[10px] text-zinc-600 select-none shrink-0 w-7 text-right font-mono">
                {line.index}
              </span>
              <span className="flex-1 break-all">{line.raw}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
