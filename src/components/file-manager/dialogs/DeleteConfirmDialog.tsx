import React from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteConfirmDialogProps {
  deleteConfirmState: {
    isOpen: boolean;
    paths: string[];
    displayName: string;
  };
  setDeleteConfirmState: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      paths: string[];
      displayName: string;
    }>
  >;
  onConfirmDelete: (paths: string[]) => void;
}

export function DeleteConfirmDialog({
  deleteConfirmState,
  setDeleteConfirmState,
  onConfirmDelete,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog
      open={deleteConfirmState.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setDeleteConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      }}
    >
      <AlertDialogContent className="rounded-3xl border border-border bg-card p-6 shadow-2xl max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div className="size-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center border border-destructive/25">
            <Trash2 className="size-6" />
          </div>
          <AlertDialogTitle className="text-lg font-bold text-foreground">
            Excluir do Servidor?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Deseja realmente excluir permanentemente <strong className="text-foreground font-semibold">"{deleteConfirmState.displayName}"</strong>? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-5 gap-2 sm:gap-0">
          <AlertDialogCancel className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirmDelete(deleteConfirmState.paths);
              setDeleteConfirmState({ isOpen: false, paths: [], displayName: "" });
            }}
            className="rounded-xl h-10 px-5 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
          >
            Sim, Excluir Definitivamente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
