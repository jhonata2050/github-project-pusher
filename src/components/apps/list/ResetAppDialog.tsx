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

export interface ResetAppDialogProps {
  appToDelete: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  isResetting: boolean;
  onConfirmReset: (appId: string) => void;
}

export function ResetAppDialog({
  appToDelete,
  onOpenChange,
  isResetting,
  onConfirmReset,
}: ResetAppDialogProps) {
  return (
    <AlertDialog open={Boolean(appToDelete)} onOpenChange={onOpenChange}>
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
              Deseja realmente excluir todos os dados do serviço{" "}
              <strong className="text-foreground font-semibold">"{appToDelete?.name}"</strong>?
            </span>
            <span className="block text-rose-500 font-semibold">
              ⚠️ AÇÃO IRREVERSÍVEL: Todos os arquivos, volumes, banco de dados e dados do serviço atual serão permanentemente destruídos.
            </span>
            <span className="block">
              O container retornará ao <strong>estado inicial limpo</strong>, pronto para você escolher um novo modelo ou subir outro código do zero.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-5 gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isResetting} className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isResetting}
            onClick={(e) => {
              e.preventDefault();
              if (appToDelete) {
                onConfirmReset(appToDelete.id);
              }
            }}
            className="rounded-xl h-10 px-5 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
          >
            {isResetting ? "Excluindo..." : "Sim, Excluir Definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
