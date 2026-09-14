import React from "react";
import { FilePlus, FolderPlus } from "lucide-react";
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

interface NewItemDialogsProps {
  docRoot: string;
  currentPath: string;
  isNewFileModalOpen: boolean;
  setIsNewFileModalOpen: (open: boolean) => void;
  newFileName: string;
  setNewFileName: (name: string) => void;
  onCreateFile: (name: string) => void;
  createFilePending: boolean;
  isNewFolderModalOpen: boolean;
  setIsNewFolderModalOpen: (open: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  onCreateFolder: (name: string) => void;
  createFolderPending: boolean;
}

export function NewItemDialogs({
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
}: NewItemDialogsProps) {
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
    </>
  );
}
