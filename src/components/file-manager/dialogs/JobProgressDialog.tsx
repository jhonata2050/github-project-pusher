import React from "react";
import { FolderArchive, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JobProgressDialogProps {
  isJobModalOpen: boolean;
  activeJob: {
    id: string;
    type: string;
    status: string;
    progress: number;
    totalFiles: number;
    processedFiles: number;
    currentFile: string;
    error?: string | undefined;
  } | null;
  onCancelActiveJob: () => void;
}

export function JobProgressDialog({
  isJobModalOpen,
  activeJob,
  onCancelActiveJob,
}: JobProgressDialogProps) {
  return (
    <Dialog open={isJobModalOpen} onOpenChange={() => {}}>
      <DialogContent className="rounded-3xl max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            {activeJob?.type === "extract" ? (
              <FolderArchive className="h-5 w-5 text-amber-500 animate-pulse" />
            ) : (
              <Archive className="h-5 w-5 text-primary animate-pulse" />
            )}
            {activeJob?.type === "extract" ? "Descompactando Arquivos..." : "Compactando Arquivos..."}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Operação em segundo plano com monitoramento em tempo real do filesystem.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-2 text-foreground truncate max-w-[280px]">
              <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              <span className="truncate">
                {activeJob?.currentFile || (activeJob?.status === "running" ? "Processando arquivos..." : "Iniciando Job...")}
              </span>
            </span>
            <span className="font-mono text-primary font-bold">{activeJob?.progress || 0}%</span>
          </div>

          <Progress value={activeJob?.progress || 0} className="h-3 rounded-full" />

          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>
              Arquivos: {activeJob?.processedFiles || 0} / {activeJob?.totalFiles || 0}
            </span>
            <span className="capitalize font-semibold text-primary">
              {activeJob?.status === "completed"
                ? "Concluído"
                : (activeJob?.progress || 0) >= 100
                ? "Finalizando..."
                : activeJob?.status || "executando"}
            </span>
          </div>

          {activeJob?.status === "running" && (
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onCancelActiveJob}
                className="rounded-xl text-xs font-medium"
              >
                Cancelar Operação
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
