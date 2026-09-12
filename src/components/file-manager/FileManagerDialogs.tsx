import React from "react";
import {
  FilePlus,
  FolderPlus,
  Edit2,
  Folder,
  Copy,
  Archive,
  FolderArchive,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { IFileInfo } from "@/lib/file-manager/types";

export interface FileManagerDialogsProps {
  docRoot: string;
  currentPath: string;

  // Novo Arquivo
  isNewFileModalOpen: boolean;
  setIsNewFileModalOpen: (open: boolean) => void;
  newFileName: string;
  setNewFileName: (name: string) => void;
  onCreateFile: (name: string) => void;
  createFilePending: boolean;

  // Nova Pasta
  isNewFolderModalOpen: boolean;
  setIsNewFolderModalOpen: (open: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  onCreateFolder: (name: string) => void;
  createFolderPending: boolean;

  // Renomear
  isRenameModalOpen: boolean;
  setIsRenameModalOpen: (open: boolean) => void;
  renameTarget: IFileInfo | null;
  renameNewName: string;
  setRenameNewName: (name: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  renamePending: boolean;

  // Mover / Copiar
  isMoveCopyModalOpen: boolean;
  setIsMoveCopyModalOpen: (open: boolean) => void;
  moveCopyAction: "move" | "copy";
  selectedPathsCount: number;
  targetDirectoryInput: string;
  setTargetDirectoryInput: (dir: string) => void;
  onMoveCopy: () => void;
  moveCopyPending: boolean;

  // Compactar
  isCompressModalOpen: boolean;
  setIsCompressModalOpen: (open: boolean) => void;
  compressArchiveName: string;
  setCompressArchiveName: (name: string) => void;
  onCompress: (archiveName: string) => void;
  compressRunning: boolean;

  // Conflito de Extração
  isExtractConflictModalOpen: boolean;
  setIsExtractConflictModalOpen: (open: boolean) => void;
  pendingExtractPath: string | null;
  onStartExtractJob: (archivePath: string, policy: "overwrite" | "skip" | "abort") => void;
  onCancelExtract: () => void;

  // Job Assíncrono (Progresso)
  isJobModalOpen: boolean;
  activeJob: {
    id: string;
    type: string;
    status: string;
    progress: number;
    totalFiles: number;
    processedFiles: number;
    currentFile: string;
    error?: string;
  } | null;
  onCancelActiveJob: () => void;

  // Exclusão
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

export function FileManagerDialogs({
  docRoot,
  currentPath,
  isNewFileModalOpen,
  setIsNewFileModalOpen,
  newFileName,
  setNewFileName,
  onCreateFile,
  createFilePending,
  isNewFolderModalOpen,
  setIsNewFolderModalOpen,
  newFolderName,
  setNewFolderName,
  onCreateFolder,
  createFolderPending,
  isRenameModalOpen,
  setIsRenameModalOpen,
  renameTarget,
  renameNewName,
  setRenameNewName,
  onRename,
  renamePending,
  isMoveCopyModalOpen,
  setIsMoveCopyModalOpen,
  moveCopyAction,
  selectedPathsCount,
  targetDirectoryInput,
  setTargetDirectoryInput,
  onMoveCopy,
  moveCopyPending,
  isCompressModalOpen,
  setIsCompressModalOpen,
  compressArchiveName,
  setCompressArchiveName,
  onCompress,
  compressRunning,
  isExtractConflictModalOpen,
  setIsExtractConflictModalOpen,
  pendingExtractPath,
  onStartExtractJob,
  onCancelExtract,
  isJobModalOpen,
  activeJob,
  onCancelActiveJob,
  deleteConfirmState,
  setDeleteConfirmState,
  onConfirmDelete,
}: FileManagerDialogsProps) {
  return (
    <>
      {/* Modal de Novo Arquivo */}
      <Dialog open={isNewFileModalOpen} onOpenChange={setIsNewFileModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-primary" /> Criar Novo Arquivo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe o nome do arquivo a ser criado em <code>{docRoot}/{currentPath}</code>
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newFileName.trim()) onCreateFile(newFileName.trim());
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label>Nome do Arquivo</Label>
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="index.php, script.js, .env"
                className="rounded-xl font-mono text-xs"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewFileModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={createFilePending || !newFileName.trim()} className="rounded-xl font-bold bg-primary">
                Criar Arquivo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Pasta */}
      <Dialog open={isNewFolderModalOpen} onOpenChange={setIsNewFolderModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" /> Criar Nova Pasta
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe o nome do novo diretório em <code>{docRoot}/{currentPath}</code>
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newFolderName.trim()) onCreateFolder(newFolderName.trim());
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label>Nome da Pasta</Label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="assets, images, config"
                className="rounded-xl font-mono text-xs"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewFolderModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={createFolderPending || !newFolderName.trim()} className="rounded-xl font-bold bg-primary">
                Criar Pasta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Renomear */}
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

      {/* Modal de Mover / Copiar */}
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

      {/* Modal de Compactação com Job Assíncrono */}
      <Dialog open={isCompressModalOpen} onOpenChange={setIsCompressModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary" /> Compactar em Arquivo ZIP
            </DialogTitle>
            <DialogDescription className="text-xs">
              Compactar {selectedPathsCount} item(ns) selecionado(s) em um arquivo .ZIP
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (compressArchiveName.trim()) {
                onCompress(compressArchiveName.trim());
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label>Nome do Arquivo ZIP</Label>
              <Input
                value={compressArchiveName}
                onChange={(e) => setCompressArchiveName(e.target.value)}
                placeholder="backup.zip ou meu-site.zip"
                className="rounded-xl font-mono text-xs"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCompressModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={!compressArchiveName.trim() || compressRunning} className="rounded-xl font-bold bg-primary">
                Compactar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Conflito de Extração */}
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

      {/* Modal de Progresso Real do Job (Descompactação / Compressão) */}
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

      {/* Modal de Confirmação para Exclusão de Arquivos */}
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
    </>
  );
}
