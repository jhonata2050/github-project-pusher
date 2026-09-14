import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { ImportProgressDialogProps } from "./types";

export function ImportProgressDialog({
  open,
  onOpenChange,
  isPending,
  isError,
  errorMessage,
  progress,
  step,
  live,
}: ImportProgressDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
            ) : isError ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-brand" />
            )}
            Status da Importação
          </DialogTitle>
          <DialogDescription>
            {isPending
              ? step || "Processando arquivos..."
              : isError
                ? "Ocorreu um erro durante a importação."
                : "Migração finalizada com sucesso!"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span>Progresso</span>
              <span>{isError ? "Erro" : `${progress}%`}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-xl font-bold text-brand">{live.clients.created}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Clientes</p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-xl font-bold text-brand">{live.services.created}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Serviços</p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-xl font-bold text-brand">{live.invoices.created}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Faturas</p>
            </div>
          </div>

          {isError && (
            <div className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive font-medium">
              {errorMessage || "Erro desconhecido ao processar os arquivos."}
            </div>
          )}
        </div>
        {!isPending && (
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full rounded-2xl bg-brand font-bold"
          >
            Fechar
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
