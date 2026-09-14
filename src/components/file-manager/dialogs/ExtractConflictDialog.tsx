import React from "react";
import { FolderArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExtractConflictDialogProps {
  docRoot: string;
  currentPath: string;
  isExtractConflictModalOpen: boolean;
  setIsExtractConflictModalOpen: (open: boolean) => void;
  pendingExtractPath: string | null;
  onStartExtractJob: (archivePath: string, policy: "overwrite" | "skip" | "abort") => void;
  onCancelExtract: () => void;
}

export function ExtractConflictDialog({
  docRoot,
  currentPath,
  isExtractConflictModalOpen,
  setIsExtractConflictModalOpen,
  pendingExtractPath,
  onStartExtractJob,
  onCancelExtract,
}: ExtractConflictDialogProps) {
  return (
    <Dialog open={isExtractConflictModalOpen} onOpenChange={setIsExtractConflictModalOpen}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <FolderArchive className="h-5 w-5 text-amber-500" /> Descompactar Arquivo ZIP
          </DialogTitle>
          <DialogDescription className="text-xs">
            Como deseja proceder caso existam arquivos com o mesmo nome no diretório <code>{docRoot}/{currentPath}</code>?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-xs font-mono text-muted-foreground p-2.5 rounded-xl bg-muted/50 truncate">
            Arquivo: {pendingExtractPath}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              onClick={() => pendingExtractPath && onStartExtractJob(pendingExtractPath, "overwrite")}
              className="rounded-xl font-bold bg-primary text-primary-foreground justify-start"
            >
              ✓ Substituir Tudo (Recomendado)
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => pendingExtractPath && onStartExtractJob(pendingExtractPath, "skip")}
              className="rounded-xl font-medium justify-start"
            >
              ↷ Ignorar Arquivos Existentes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancelExtract}
              className="rounded-xl font-medium justify-start text-muted-foreground"
            >
              ✕ Cancelar Operação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
