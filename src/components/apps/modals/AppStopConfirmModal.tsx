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

export interface AppStopConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName?: string;
  onConfirm: () => void;
  isPending: boolean;
}

export function AppStopConfirmModal({
  open,
  onOpenChange,
  appName,
  onConfirm,
  isPending,
}: AppStopConfirmModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl border border-border bg-card p-6 shadow-2xl max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div className="size-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center border border-destructive/25">
            <Trash2 className="size-6" />
          </div>
          <AlertDialogTitle className="text-lg font-bold text-foreground">
            Excluir Serviço e Resetar Container?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
            <span className="block">
              Deseja realmente excluir permanentemente o serviço <strong className="text-foreground font-semibold">"{appName}"</strong>?
            </span>
            <span className="block text-rose-500 font-semibold">
              ⚠️ AÇÃO IRREVERSÍVEL: Todos os arquivos, volumes, banco de dados e dados do serviço atual serão permanentemente apagados do servidor.
            </span>
            <span className="block">
              O container retornará ao <strong>estado inicial limpo</strong>, permitindo que você escolha um novo modelo ou suba outro código do zero.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-5 gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isPending} className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="rounded-xl h-10 px-5 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
          >
            {isPending ? "Excluindo..." : "Sim, Excluir Definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
