import React from "react";
import { FolderOpen, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { BreadcrumbSegment } from "./types";

interface ToolbarBreadcrumbsSearchProps {
  docRoot: string;
  currentPath: string;
  breadcrumbSegments: BreadcrumbSegment[];
  onNavigate: (path: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ToolbarBreadcrumbsSearch({
  docRoot,
  currentPath,
  breadcrumbSegments,
  onNavigate,
  searchQuery,
  onSearchChange,
}: ToolbarBreadcrumbsSearchProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 px-4 bg-muted/30 border rounded-2xl text-xs">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 overflow-x-auto py-1 font-mono">
        <button
          type="button"
          onClick={() => onNavigate("")}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted transition-colors font-bold ${
            !currentPath ? "text-primary bg-primary/10" : "text-muted-foreground"
          }`}
        >
          <FolderOpen className="h-3.5 w-3.5 text-primary" />
          <span>{docRoot}</span>
        </button>

        {breadcrumbSegments.map((segment, idx) => (
          <React.Fragment key={segment.path}>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <button
              type="button"
              onClick={() => onNavigate(segment.path)}
              className={`px-2 py-1 rounded-lg hover:bg-muted transition-colors font-medium ${
                idx === breadcrumbSegments.length - 1 ? "text-primary font-bold bg-primary/10" : "text-foreground"
              }`}
            >
              {segment.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Campo de Filtro e Busca Rápida */}
      <div className="relative min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Filtrar arquivos no diretório..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 rounded-xl text-xs bg-background"
        />
      </div>
    </div>
  );
}
