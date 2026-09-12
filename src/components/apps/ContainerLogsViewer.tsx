import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Terminal,
  Search,
  RefreshCw,
  Copy,
  Check,
  Download,
  WrapText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface ContainerLogsViewerProps {
  logs: string;
  appName?: string;
  buildPack?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export type LogLevel = "all" | "info" | "warn" | "error" | "debug";
export type LogDisplayMode = "formatted" | "raw";

export interface ParsedLogLine {
  id: string;
  index: number;
  raw: string;
  timestamp: string;
  source: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  meta: Record<string, any>;
  isJson: boolean;
}

function parseSingleLogLine(raw: string, index: number): ParsedLogLine {
  let timestamp = "";
  let source = "";
  let message = raw.trim();
  let level: "info" | "warn" | "error" | "debug" = "info";
  let meta: Record<string, any> = {};
  let isJson = false;

  // 1. Padrão Docker Swarm: <ISO-DATE> <service_task> | <payload>
  const swarmMatch = raw.match(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+([^\s|]+)\s*\|\s*(.*)$/
  );
  if (swarmMatch && swarmMatch[1] && swarmMatch[2] && swarmMatch[3]) {
    const rawTs = swarmMatch[1];
    const fullSource = swarmMatch[2].trim();
    message = swarmMatch[3].trim();

    // Formatar timestamp amigável no fuso local
    try {
      const d = new Date(rawTs);
      if (!isNaN(d.getTime())) {
        timestamp = d.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      }
    } catch {
      timestamp = rawTs.slice(11, 19);
    }

    // Simplificar nome da task para algo legível (ex: "app_123456_web.1.xyz@dk1" -> "web.1@dk1")
    const taskParts = fullSource.split("_");
    const lastPart = taskParts[taskParts.length - 1] || fullSource;
    source = lastPart;
  } else {
    // 2. Padrão Docker padrão: <ISO-DATE> <payload>
    const standardMatch = raw.match(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+(.*)$/
    );
    if (standardMatch && standardMatch[1] && standardMatch[2]) {
      const rawTs = standardMatch[1];
      message = standardMatch[2].trim();
      try {
        const d = new Date(rawTs);
        if (!isNaN(d.getTime())) {
          timestamp = d.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        }
      } catch {
        timestamp = rawTs.slice(11, 19);
      }
    }
  }

  // 3. Tentar decodificar payload JSON (Caddy, Go, Node.js pino/winston, Python structlog, etc.)
  if (message.startsWith("{") && message.endsWith("}")) {
    try {
      const parsed = JSON.parse(message);
      isJson = true;

      // Nível de log
      const rawLvl = String(parsed.level || parsed.severity || parsed.lvl || "").toLowerCase();
      if (rawLvl.includes("err") || rawLvl.includes("fatal") || rawLvl.includes("crit")) {
        level = "error";
      } else if (rawLvl.includes("warn")) {
        level = "warn";
      } else if (rawLvl.includes("debug") || rawLvl.includes("trace")) {
        level = "debug";
      } else {
        level = "info";
      }

      // Timestamp de alta precisão se presente no JSON e não capturado no prefixo
      if (!timestamp && parsed.ts) {
        try {
          const tsNum = typeof parsed.ts === "number" ? parsed.ts * (parsed.ts < 1e11 ? 1000 : 1) : Date.parse(parsed.ts);
          const d = new Date(tsNum);
          if (!isNaN(d.getTime())) {
            timestamp = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          }
        } catch {}
      }

      // Mensagem principal
      const mainMsg = parsed.msg || parsed.message || parsed.log || parsed.event || "";
      const { level: _l, ts: _t, msg: _m, message: _me, log: _lo, event: _ev, ...rest } = parsed;
      meta = rest;
      message = mainMsg || JSON.stringify(rest);
    } catch {
      isJson = false;
    }
  }

  // 4. Se não for JSON, aplicar heurísticas de texto plano
  if (!isJson) {
    const lower = message.toLowerCase();
    if (lower.includes("error") || lower.includes("fatal") || lower.includes("panic") || lower.includes("exception") || lower.includes("failed")) {
      level = "error";
    } else if (lower.includes("warn") || lower.includes("warning")) {
      level = "warn";
    } else if (lower.includes("debug") || lower.includes("trace")) {
      level = "debug";
    } else {
      level = "info";
    }
  }

  return {
    id: `log-${index}`,
    index: index + 1,
    raw,
    timestamp: timestamp || "--:--:--",
    source,
    level,
    message,
    meta,
    isJson,
  };
}

export function ContainerLogsViewer({
  logs,
  appName = "Aplicação",
  buildPack,
  isLoading = false,
  onRefresh,
}: ContainerLogsViewerProps) {
  const [displayMode, setDisplayMode] = useState<LogDisplayMode>("formatted");
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel>("all");
  const [autoScroll, setAutoScroll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fazer o parsing de todas as linhas do log
  const parsedLines = useMemo(() => {
    if (!logs || !logs.trim()) return [];
    const lines = logs.split("\n");
    return lines
      .map((line, idx) => (line.trim().length > 0 ? parseSingleLogLine(line, idx) : null))
      .filter((line): line is ParsedLogLine => line !== null);
  }, [logs]);

  // Contadores por nível de log
  const levelCounts = useMemo(() => {
    const counts = { all: parsedLines.length, info: 0, warn: 0, error: 0, debug: 0 };
    parsedLines.forEach((l) => {
      counts[l.level]++;
    });
    return counts;
  }, [parsedLines]);

  // Linhas filtradas por busca e por nível
  const filteredLines = useMemo(() => {
    return parsedLines.filter((l) => {
      if (levelFilter !== "all" && l.level !== levelFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.message.toLowerCase().includes(q) ||
        l.raw.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q) ||
        Object.entries(l.meta).some(([k, v]) => `${k}=${v}`.toLowerCase().includes(q))
      );
    });
  }, [parsedLines, levelFilter, searchQuery]);

  // Rolagem automática ao final
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredLines, autoScroll]);

  // Copiar logs
  const handleCopyLogs = () => {
    const textToCopy =
      displayMode === "formatted"
        ? filteredLines
            .map(
              (l) =>
                `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message} ${
                  Object.keys(l.meta).length ? JSON.stringify(l.meta) : ""
                }`
            )
            .join("\n")
        : filteredLines.map((l) => l.raw).join("\n");

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Logs copiados para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Baixar logs (.txt / .log)
  const handleDownloadLogs = () => {
    const textToDownload = filteredLines.map((l) => l.raw).join("\n");
    const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${appName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-logs-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download do arquivo de log iniciado!");
  };

  const getEngineBadge = () => {
    if (buildPack === "static") return "Caddy Server 2 (HTTP/3)";
    if (buildPack === "dockerfile") return "Dockerfile Container";
    if (buildPack === "dockercompose") return "Docker Compose Stack";
    if (buildPack === "nixpacks") return "Nixpacks Auto-Engine";
    return buildPack || "Cluster Service";
  };

  return (
    <div className="rounded-3xl border border-zinc-800 shadow-xl overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* 1. TOPO DO TERMINAL (ESTILO MAC / LINUX WORKSTATION) */}
      <div className="bg-zinc-900/90 backdrop-blur border-b border-zinc-800 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Lado Esquerdo: Botões e Título da Aplicação */}
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
              {getEngineBadge()}
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

      {/* 2. BARRA DE FILTROS & BUSCA */}
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

      {/* 3. CORPO DO TERMINAL (VISUALIZAÇÃO FORMATADA OU RAW) */}
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

      {/* 4. RODAPÉ INFORMATIVO COM STATUS DA CONEXÃO */}
      <div className="bg-zinc-900/70 border-t border-zinc-800 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
        <div className="flex items-center gap-3">
          <span>
            Exibindo <strong className="text-zinc-300">{filteredLines.length}</strong> de{" "}
            <strong className="text-zinc-300">{parsedLines.length}</strong> eventos
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
    </div>
  );
}
