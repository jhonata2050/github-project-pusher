import React from "react";
import { Archive } from "lucide-react";
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

interface CompressDialogProps {
  isCompressModalOpen: boolean;
  setIsCompressModalOpen: (open: boolean) => void;
  selectedPathsCount: number;
  compressArchiveName: string;
  setCompressArchiveName: (name: string) => void;
  onCompress: (archiveName: string) => void;
  compressRunning: boolean;
}

export function CompressDialog({
  isCompressModalOpen,
  setIsCompressModalOpen,
  selectedPathsCount,
  compressArchiveName,
  setCompressArchiveName,
  onCompress,
  compressRunning,
}: CompressDialogProps) {
  return (
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
  );
}
