import React from "react";
import {
  FolderOpen,
  FolderPlus,
  FilePlus,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Search,
  Upload,
  Copy,
  Folder,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  LayoutList,
  LayoutGrid,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface BreadcrumbSegment {
  name: string;
  path: string;
}

export interface FileManagerToolbarProps {
  // Navegação
  historyIndex: number;
  historyLength: number;
  currentPath: string;
  navigateBack: () => void;
  navigateForward: () => void;
  navigateUp: () => void;
  // Sincronização
  isFetching: boolean;
  onRefresh: () => void;
  // Ações de criação e upload
  onOpenNewFolder: () => void;
  onOpenNewFile: () => void;
  onTriggerUpload: () => void;
  showHidden: boolean;
  onToggleShowHidden: () => void;
  viewMode: "list" | "grid";
  onSetViewMode: (mode: "list" | "grid") => void;
  // Breadcrumbs e busca
  docRoot: string;
  breadcrumbSegments: BreadcrumbSegment[];
  onNavigate: (path: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // Ações em massa
  selectedPaths: string[];
  onCopy: () => void;
  onMove: () => void;
  onCompress: () => void;
  onDeleteSelected: () => void;
  deletePending?: boolean;
}

export function FileManagerToolbar({
  historyIndex,
  historyLength,
  currentPath,
  navigateBack,
  navigateForward,
  navigateUp,
  isFetching,
  onRefresh,
  onOpenNewFolder,
  onOpenNewFile,
  onTriggerUpload,
  showHidden,
  onToggleShowHidden,
  viewMode,
  onSetViewMode,
  docRoot,
  breadcrumbSegments,
  onNavigate,
  searchQuery,
  onSearchChange,
  selectedPaths,
  onCopy,
  onMove,
  onCompress,
  onDeleteSelected,
  deletePending,
}: FileManagerToolbarProps) {
  return (
    <>
      {/* 1. BARRA DE FERRAMENTAS PRINCIPAL (Estilo cPanel / DirectAdmin) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border rounded-3xl shadow-sm">
        {/* Controles de Navegação */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={historyIndex <= 0}
            onClick={navigateBack}
            className="rounded-xl h-8 w-8 p-0"
            title="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={historyIndex >= historyLength - 1}
            onClick={navigateForward}
            className="rounded-xl h-8 w-8 p-0"
            title="Avançar"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={!currentPath}
            onClick={navigateUp}
            className="rounded-xl h-8 w-8 p-0"
            title="Subir um nível de diretório"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={isFetching}
            className="rounded-xl h-8 px-2.5 text-xs font-semibold gap-1.5"
            title="Sincronizar e atualizar lista com o container"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>

        {/* Ações de Criação e Upload */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenNewFolder}
            className="rounded-xl h-8 px-3 text-xs font-semibold gap-1.5 border-primary/30 hover:bg-primary/5"
          >
            <FolderPlus className="h-3.5 w-3.5 text-primary" />
            <span>Nova Pasta</span>
          </Button>

          <Button
            size="sm"
            onClick={onOpenNewFile}
            className="rounded-xl h-8 px-3 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <FilePlus className="h-3.5 w-3.5" />
            <span>Novo Arquivo</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onTriggerUpload}
            className="rounded-xl h-8 px-3 text-xs font-semibold gap-1.5 bg-muted/40 hover:bg-muted"
          >
            <Upload className="h-3.5 w-3.5 text-foreground" />
            <span>Upload</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleShowHidden}
            className="rounded-xl h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            title={showHidden ? "Ocultar arquivos com ponto (.env, .htaccess)" : "Mostrar arquivos ocultos"}
          >
            {showHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>

          <div className="border-l pl-2 flex items-center gap-1">
            <Button
              size="sm"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              onClick={() => onSetViewMode("list")}
              className="rounded-xl h-8 w-8 p-0"
              title="Visualização em Lista"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              onClick={() => onSetViewMode("grid")}
              className="rounded-xl h-8 w-8 p-0"
              title="Visualização em Grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE BREADCRUMBS & BUSCA */}
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

      {/* 3. BARRA DE AÇÕES EM MASSA (Quando houver seleção) */}
      {selectedPaths.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 p-3 px-5 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-bold px-2.5 py-0.5 font-mono">
              {selectedPaths.length} selecionado(s)
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Ações em lote no servidor:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onCopy}
              className="rounded-xl h-7 text-xs gap-1.5 font-semibold"
            >
              <Copy className="h-3 w-3" /> Copiar
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onMove}
              className="rounded-xl h-7 text-xs gap-1.5 font-semibold"
            >
              <Folder className="h-3 w-3" /> Mover
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onCompress}
              className="rounded-xl h-7 text-xs gap-1.5 font-semibold"
            >
              <Archive className="h-3 w-3" /> Compactar (ZIP)
            </Button>

            <Button
              size="sm"
              variant="destructive"
              disabled={deletePending}
              onClick={onDeleteSelected}
              className="rounded-xl h-7 text-xs gap-1.5 font-bold"
            >
              <Trash2 className="h-3 w-3" /> Excluir
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
