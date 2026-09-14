import { useState, useCallback, useMemo } from "react";
import type { FileViewMode, BreadcrumbSegment } from "./types";

export function useFileManagerNavigation(initialPath: string = "") {
  const [currentPath, setCurrentPath] = useState<string>(initialPath);
  const [history, setHistory] = useState<string[]>([initialPath]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [showHidden, setShowHidden] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<FileViewMode>("list");

  // Função de navegação com histórico
  const navigateTo = useCallback((newPath: string) => {
    const clean = newPath.replace(/^[\/\\]+|[\/\\]+$/g, "");
    if (clean === currentPath) return;
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(clean);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
    setCurrentPath(clean);
  }, [currentPath, history, historyIndex]);

  const navigateBack = useCallback(() => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setCurrentPath(history[prevIdx] || "");
    }
  }, [history, historyIndex]);

  const navigateForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setCurrentPath(history[nextIdx] || "");
    }
  }, [history, historyIndex]);

  const navigateUp = useCallback(() => {
    if (!currentPath) return;
    const parts = currentPath.split("/");
    parts.pop();
    navigateTo(parts.join("/"));
  }, [currentPath, navigateTo]);

  // Breadcrumbs interativos
  const breadcrumbSegments = useMemo<BreadcrumbSegment[]>(() => {
    if (!currentPath) return [];
    const parts = currentPath.split("/");
    return parts.map((part, idx) => ({
      name: part,
      path: parts.slice(0, idx + 1).join("/"),
    }));
  }, [currentPath]);

  return {
    currentPath,
    setCurrentPath,
    history,
    historyIndex,
    showHidden,
    setShowHidden,
    viewMode,
    setViewMode,
    navigateTo,
    navigateBack,
    navigateForward,
    navigateUp,
    breadcrumbSegments,
  };
}
