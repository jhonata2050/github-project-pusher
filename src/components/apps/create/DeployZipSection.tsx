import React, { useRef } from "react";
import { Upload, FileArchive, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DeployZipSectionProps {
  zipFile: File | null;
  onFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
}

export function DeployZipSection({
  zipFile,
  onFileDrop,
  onFileSelect,
  onRemoveFile,
}: DeployZipSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={onFileSelect}
        className="hidden"
      />

      {!zipFile ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-3xl p-10 text-center hover:border-primary/50 transition-all cursor-pointer bg-muted/20 hover:bg-muted/40 group"
        >
          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <Upload className="h-7 w-7" />
          </div>
          <p className="font-bold text-sm">Arraste o arquivo .zip aqui</p>
          <p className="text-xs text-primary font-medium mt-0.5">ou clique para selecionar</p>
          <p className="text-[11px] text-muted-foreground mt-2">
            Apenas arquivos .zip aceitos (Node.js, Python, PHP, Docker, HTML)
          </p>
        </div>
      ) : (
        <div className="bg-muted/40 p-4 rounded-2xl border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileArchive className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-xs">{zipFile.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(zipFile.size / (1024 * 1024)).toFixed(2)} MB • Pronto para envio
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onRemoveFile}
            className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
