import { useMemo } from "react";
import type { ParsedLogLine, LogLevel } from "./types.ts";

/**
 * Faz o parsing de uma única linha de log (Swarm, Docker, JSON estruturado ou texto plano)
 */
export function parseSingleLogLine(raw: string, index: number): ParsedLogLine {
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

    // Simplificar nome da task para algo legível (ex: "app_123456_web.1.xyz@dk1" -> "web.1.xyz@dk1")
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
        } catch {
          // Ignorar falha de timestamp JSON
        }
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

/**
 * Hook para parsing de todas as linhas de log e cálculo dos contadores por nível
 */
export function useParsedLogs(logs: string) {
  const parsedLines = useMemo(() => {
    if (!logs || !logs.trim()) return [];
    const lines = logs.split("\n");
    return lines
      .map((line, idx) => (line.trim().length > 0 ? parseSingleLogLine(line, idx) : null))
      .filter((line): line is ParsedLogLine => line !== null);
  }, [logs]);

  const levelCounts = useMemo(() => {
    const counts: Record<LogLevel, number> = { all: parsedLines.length, info: 0, warn: 0, error: 0, debug: 0 };
    parsedLines.forEach((l) => {
      counts[l.level]++;
    });
    return counts;
  }, [parsedLines]);

  return { parsedLines, levelCounts };
}
