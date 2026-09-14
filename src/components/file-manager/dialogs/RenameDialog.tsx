import React from "react";
import { Edit2 } from "lucide-react";
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
import type { IFileInfo } from "@/lib/file-manager/types";

interface RenameDialogProps {
  isRenameModalOpen: boolean;
  setIsRenameModalOpen: (open: boolean) => void;
  renameTarget: IFileInfo | null;
  renameNewName: string;
  setRenameNewName: (name: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  renamePending: boolean;
}

export function RenameDialog({
  isRenameModalOpen,
  setIsRenameModalOpen,
  renameTarget,
  renameNewName,
  setRenameNewName,
  onRename,
  renamePending,
}: RenameDialogProps) {
  return (
    <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-primary" /> Renomear Item
          </DialogTitle>
          <DialogDescription className="text-xs">
            Altere o nome de <strong>{renameTarget?.name}</strong>
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (renameTarget && renameNewName.trim()) {
              onRename(renameTarget.path, renameNewName.trim());
            }
          }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-2">
            <Label>Novo Nome</Label>
            <Input
              value={renameNewName}
              onChange={(e) => setRenameNewName(e.target.value)}
              className="rounded-xl font-mono text-xs"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRenameModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={renamePending || !renameNewName.trim()} className="rounded-xl font-bold bg-primary">
              Renomear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
