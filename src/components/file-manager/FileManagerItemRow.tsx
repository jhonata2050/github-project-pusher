import React, { useCallback } from "react";
import {
  Code2,
  FolderArchive,
  Edit2,
  Download,
  Info,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { IFileInfo } from "@/lib/file-manager/types";
import { getItemIcon } from "./FileManagerItemIcons";

export interface FileRowItemProps {
  item: IFileInfo;
  isSelected: boolean;
  onToggleSelect: (path: string) => void;
  onNavigate: (path: string) => void;
  onOpenFileForEdit: (path: string) => void;
  onOpenChmod: (item: IFileInfo) => void;
  onOpenExtract: (path: string) => void;
  onOpenRename: (item: IFileInfo) => void;
  onDownload: (item: IFileInfo) => void;
  onOpenProperties: (item: IFileInfo) => void;
  onDelete: (item: IFileInfo) => void;
}

export const FileRowItem = React.memo(function FileRowItem({
  item,
  isSelected,
  onToggleSelect,
  onNavigate,
  onOpenFileForEdit,
  onOpenChmod,
  onOpenExtract,
  onOpenRename,
  onDownload,
  onOpenProperties,
  onDelete,
}: FileRowItemProps) {
  const ext = item.name.split(".").pop()?.toLowerCase() || "";
  const isZip = ["zip", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz"].includes(ext);
  const isBinary = [
    "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "tiff",
    "mp4", "webm", "mp3", "wav", "ogg", "flac", "aac",
    "pdf", "exe", "bin", "iso", "dmg", "apk", "jar", "wasm", "db", "sqlite",
  ].includes(ext);

  const handleSelectClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelect(item.path);
    },
    [onToggleSelect, item.path],
  );

  const handleRowClick = useCallback(() => {
    if (item.type === "directory") {
      onNavigate(item.path);
    } else if (isZip) {
      // Se for arquivo compactado (.zip, .tar, etc.), abre o modal de descompactação imediatamente!
      onOpenExtract(item.path);
    } else if (isBinary) {
      // Se for arquivo binário ou imagem, abre as propriedades/download sem travar o editor
      onOpenProperties(item);
    } else {
      onOpenFileForEdit(item.path);
    }
  }, [item.type, item.path, isZip, isBinary, onNavigate, onOpenExtract, onOpenProperties, onOpenFileForEdit]);

  const handleChmodClick = useCallback(() => {
    onOpenChmod(item);
  }, [onOpenChmod, item]);

  const handleEditClick = useCallback(() => {
    if (isZip) {
      onOpenExtract(item.path);
    } else if (isBinary) {
      onOpenProperties(item);
    } else {
      onOpenFileForEdit(item.path);
    }
  }, [isZip, isBinary, onOpenExtract, onOpenProperties, onOpenFileForEdit, item]);

  const handleExtractClick = useCallback(() => {
    onOpenExtract(item.path);
  }, [onOpenExtract, item.path]);

  const handleRenameClick = useCallback(() => {
    onOpenRename(item);
  }, [onOpenRename, item]);

  const handleDownloadClick = useCallback(() => {
    onDownload(item);
  }, [onDownload, item]);

  const handlePropertiesClick = useCallback(() => {
    onOpenProperties(item);
  }, [onOpenProperties, item]);

  const handleDeleteClick = useCallback(() => {
    onDelete(item);
  }, [onDelete, item]);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 px-6 gap-3 transition-colors group ${
        isSelected ? "bg-primary/5" : "hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={handleSelectClick}
          className="cursor-pointer text-muted-foreground hover:text-foreground p-0.5"
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 text-muted-foreground/50" />
          )}
        </button>

        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={handleRowClick}
        >
          <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            {getItemIcon(item)}
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors font-mono truncate">
                {item.name}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 shrink-0">
                {item.type === "directory" ? "DIR" : ext || "FILE"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              {item.path}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-8 shrink-0 text-xs">
        <span className="font-mono text-muted-foreground hidden sm:block w-24 text-right">
          {item.sizeFormatted}
        </span>

        <button
          type="button"
          onClick={handleChmodClick}
          className="font-mono text-muted-foreground hover:text-primary hidden md:block w-20 text-right underline-offset-2 hover:underline"
          title="Clique para alterar permissão"
        >
          {item.permissions}
        </button>

        <span className="font-mono text-muted-foreground hidden lg:block w-32 text-right">
          {new Date(item.mtime).toLocaleDateString("pt-BR")}
        </span>

        <div className="flex items-center gap-1 w-36 justify-end">
          {item.type !== "directory" && !isZip && !isBinary && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleEditClick}
              className="rounded-xl h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
              title="Editar Código"
            >
              <Code2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {isZip && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleExtractClick}
              className="rounded-xl h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
              title="Descompactar / Extrair Arquivo ZIP"
            >
              <FolderArchive className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={handleRenameClick}
            className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Renomear (F2)"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>

          {item.type !== "directory" && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDownloadClick}
              className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={handlePropertiesClick}
            className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Propriedades"
          >
            <Info className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleDeleteClick}
            className="rounded-xl h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
});
