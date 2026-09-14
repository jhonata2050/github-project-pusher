import React from "react";
import { Folder, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MoveCopyDialogProps {
  docRoot: string;
  isMoveCopyModalOpen: boolean;
  setIsMoveCopyModalOpen: (open: boolean) => void;
  moveCopyAction: "move" | "copy";
  selectedPathsCount: number;
  targetDirectoryInput: string;
  setTargetDirectoryInput: (dir: string) => void;
  onMoveCopy: () => void;
  moveCopyPending: boolean;
}

export function MoveCopyDialog({
  docRoot,
  isMoveCopyModalOpen,
  setIsMoveCopyModalOpen,
  moveCopyAction,
  selectedPathsCount,
  targetDirectoryInput,
  setTargetDirectoryInput,
  onMoveCopy,
  moveCopyPending,
}: MoveCopyDialogProps) {
  return (
    <Dialog open={isMoveCopyModalOpen} onOpenChange={setIsMoveCopyModalOpen}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            {moveCopyAction === "move" ? <Folder className="h-5 w-5 text-primary" /> : <Copy className="h-5 w-5 text-primary" />}
            {moveCopyAction === "move" ? "Mover Itens Selecionados" : "Copiar Itens Selecionados"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {moveCopyAction === "move" ? "Mover" : "Copiar"} {selectedPathsCount} item(ns) para um diretório de destino.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onMoveCopy();
          }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-2">
            <Label>Diretório de Destino (em branco para raiz {docRoot})</Label>
            <Input
              value={targetDirectoryInput}
              onChange={(e) => setTargetDirectoryInput(e.target.value)}
              placeholder="ex: assets/css ou js"
              className="rounded-xl font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsMoveCopyModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={moveCopyPending} className="rounded-xl font-bold bg-primary">
              {moveCopyAction === "move" ? "Mover" : "Copiar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
