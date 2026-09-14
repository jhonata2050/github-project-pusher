import React, { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  type ContainerLogsViewerProps,
  type LogLevel,
  type LogDisplayMode,
  type ParsedLogLine,
  useParsedLogs,
  LogsHeader,
  LogsFilterBar,
  LogsTerminalBody,
  LogsFooter,
} from "./container-logs/index.ts";

export type {
  ContainerLogsViewerProps,
  LogLevel,
  LogDisplayMode,
  ParsedLogLine,
};

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

  // Parsing e contadores por nível através do hook especializado
  const { parsedLines, levelCounts } = useParsedLogs(logs);

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

  // Rolagem automática ao final quando novos logs chegam
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredLines, autoScroll]);

  // Copiar logs para a área de transferência
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

  return (
    <div className="rounded-3xl border border-zinc-800 shadow-xl overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* 1. Topo do Terminal */}
      <LogsHeader
        appName={appName}
        buildPack={buildPack}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        copied={copied}
        handleCopyLogs={handleCopyLogs}
        handleDownloadLogs={handleDownloadLogs}
        isLoading={isLoading}
        onRefresh={onRefresh}
      />

      {/* 2. Barra de Filtros & Busca */}
      <LogsFilterBar
        levelFilter={levelFilter}
        setLevelFilter={setLevelFilter}
        levelCounts={levelCounts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        wrapLines={wrapLines}
        setWrapLines={setWrapLines}
      />

      {/* 3. Corpo do Terminal */}
      <LogsTerminalBody
        containerRef={containerRef}
        filteredLines={filteredLines}
        displayMode={displayMode}
        wrapLines={wrapLines}
        searchQuery={searchQuery}
      />

      {/* 4. Rodapé Informativo */}
      <LogsFooter
        filteredCount={filteredLines.length}
        totalCount={parsedLines.length}
        levelFilter={levelFilter}
        autoScroll={autoScroll}
        setAutoScroll={setAutoScroll}
      />
    </div>
  );
}
