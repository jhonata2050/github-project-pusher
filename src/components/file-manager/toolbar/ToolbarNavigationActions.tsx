import {
  FolderPlus,
  FilePlus,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Upload,
  Eye,
  EyeOff,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ToolbarNavigationActionsProps {
  historyIndex: number;
  historyLength: number;
  currentPath: string;
  navigateBack: () => void;
  navigateForward: () => void;
  navigateUp: () => void;
  isFetching: boolean;
  onRefresh: () => void;
  onOpenNewFolder: () => void;
  onOpenNewFile: () => void;
  onTriggerUpload: () => void;
  showHidden: boolean;
  onToggleShowHidden: () => void;
  viewMode: "list" | "grid";
  onSetViewMode: (mode: "list" | "grid") => void;
}

export function ToolbarNavigationActions({
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
}: ToolbarNavigationActionsProps) {
  return (
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
  );
}
