import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { IFileReadResult } from "@/lib/file-manager/types";

interface EditorConflictDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  fileData: IFileReadResult;
  onReload: () => void;
  onForceOverwrite: () => void;
  onCancel: () => void;
}

export function EditorConflictDialog({
  isOpen,
  onOpenChange,
  fileData,
  onReload,
  onForceOverwrite,
  onCancel,
}: EditorConflictDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md bg-zinc-950 text-white border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-amber-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Conflito de Concorrência Detectado
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs text-zinc-300 py-2">
          <p>
            O arquivo <strong>{fileData.name}</strong> foi alterado no servidor por outro processo ou usuário desde que você o abriu.
          </p>
          <p className="text-zinc-400">
            Para evitar perda acidental de dados, escolha como deseja prosseguir:
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={onReload}
            className="rounded-xl font-bold bg-primary text-primary-foreground"
          >
            🔄 Recarregar do Servidor (Descartar locais)
          </Button>
          <Button
            variant="destructive"
            onClick={onForceOverwrite}
            className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white"
          >
            ⚠️ Sobrescrever no Servidor (Forçar)
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="rounded-xl border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancelar (Continuar editando localmente)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
