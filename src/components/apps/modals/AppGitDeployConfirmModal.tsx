import React from "react";
import { AlertTriangle } from "lucide-react";
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

export interface AppGitDeployConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName?: string;
  gitRepoInput: string;
  gitBranchInput: string;
  onConfirm: () => void;
}

export function AppGitDeployConfirmModal({
  open,
  onOpenChange,
  appName,
  gitRepoInput,
  gitBranchInput,
  onConfirm,
}: AppGitDeployConfirmModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl border border-border bg-card p-6 shadow-2xl max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div className="size-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/25">
            <AlertTriangle className="size-6" />
          </div>
          <AlertDialogTitle className="text-lg font-bold text-foreground">
            Substituir e Resetar Container?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
            <span>
              Este container está atualmente configurado com <strong className="text-foreground font-semibold">"{appName}"</strong>.
            </span>
            <span className="block">
              Fazer deploy a partir deste repositório Git irá <strong className="text-rose-500 font-semibold">resetar o container atual, remover os arquivos do serviço anterior</strong> e implantar o novo código-fonte de:
            </span>
            <code className="block p-2.5 rounded-xl bg-muted font-mono text-[11px] text-foreground truncate border">
              {gitRepoInput} ({gitBranchInput || "main"})
            </code>
            <span className="block text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ Caso possua alterações ou dados importantes não salvos, certifique-se de salvar antes de prosseguir.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-5 gap-2 sm:gap-0">
          <AlertDialogCancel className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-xl h-10 px-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            Sim, Resetar e Fazer Deploy
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
