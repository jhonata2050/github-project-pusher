import React from "react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileCode,
  Search,
  Maximize2,
  Minimize2,
  Save,
  Loader2,
  X,
} from "lucide-react";
import type { IFileReadResult } from "@/lib/file-manager/types";

interface EditorHeaderProps {
  fileData: IFileReadResult;
  documentRoot?: string | undefined;
  isDirty: boolean;
  lineCount: number;
  isBinaryFile: boolean;
  isFullscreen: boolean;
  isSaving: boolean;
  onToggleSearch: () => void;
  onToggleFullscreen: () => void;
  onSave: () => void;
  onClose: () => void;
}

export function EditorHeader({
  fileData,
  documentRoot,
  isDirty,
  lineCount,
  isBinaryFile,
  isFullscreen,
  isSaving,
  onToggleSearch,
  onToggleFullscreen,
  onSave,
  onClose,
}: EditorHeaderProps) {
  return (
    <DialogHeader className="p-4 px-6 border-b border-zinc-800 bg-[#252526] flex-row items-center justify-between space-y-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
          <FileCode className="h-4 w-4" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-sm font-bold font-mono truncate text-white">
              {fileData.name}
            </DialogTitle>
            {isDirty ? (
              <Badge
                variant="outline"
                className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] py-0 px-2 font-bold animate-pulse"
              >
                ● Não Salvo
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] py-0 px-2 font-bold"
              >
                ✓ Salvo
              </Badge>
            )}
            <Badge
              variant="secondary"
              className="bg-zinc-800 text-zinc-400 text-[10px] py-0 px-1.5 font-mono uppercase"
            >
              {fileData.mimeType.split("/").pop()}
            </Badge>
          </div>
          <p className="text-[11px] text-zinc-400 font-mono truncate">
            {(documentRoot || "/app").replace(/\/+$/, "")}/{fileData.path} • {fileData.sizeFormatted} • {lineCount} linhas
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={onToggleSearch}
          className="rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 px-2.5 text-xs gap-1.5"
          title="Localizar e Substituir (Ctrl+F)"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Buscar</span>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onToggleFullscreen}
          className="rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 w-8 p-0"
          title={isFullscreen ? "Restaurar" : "Tela Cheia"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </Button>

        {!isBinaryFile && (
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving || !isDirty}
            className="rounded-xl font-bold text-xs h-8 px-3.5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            title="Salvar alterações no servidor (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Salvar (Ctrl+S)</span>
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 h-8 w-8 p-0"
          title="Fechar editor"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </DialogHeader>
  );
}
