import { Copy, Folder, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ToolbarBatchActionsProps {
  selectedPaths: string[];
  onCopy: () => void;
  onMove: () => void;
  onCompress: () => void;
  onDeleteSelected: () => void;
  deletePending?: boolean | undefined;
}

export function ToolbarBatchActions({
  selectedPaths,
  onCopy,
  onMove,
  onCompress,
  onDeleteSelected,
  deletePending,
}: ToolbarBatchActionsProps) {
  if (selectedPaths.length === 0) return null;

  return (
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
  );
}
