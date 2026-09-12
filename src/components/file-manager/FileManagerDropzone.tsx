import React, { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface FileManagerDropzoneProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatusText: string;
  docRoot: string;
  currentPath: string;
  onUploadFiles: (files: FileList | null) => void;
}

export function FileManagerDropzone({
  fileInputRef,
  isUploading,
  uploadProgress,
  uploadStatusText,
  docRoot,
  currentPath,
  onUploadFiles,
}: FileManagerDropzoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  return (
    <div className="p-6 border-t bg-muted/10">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => onUploadFiles(e.target.files)}
        multiple
        className="hidden"
      />
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          onUploadFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-card cursor-pointer ${
          isDraggingOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-primary/30 hover:border-primary/60 hover:bg-muted/30"
        }`}
      >
        {isUploading ? (
          <div className="space-y-4 py-4 max-w-md mx-auto">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-foreground truncate max-w-[280px]">
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                <span className="truncate">{uploadStatusText || "Processando upload..."}</span>
              </span>
              <span className="font-mono text-primary font-bold">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2.5 rounded-full" />
            <p className="text-[11px] text-muted-foreground">
              Gravando diretamente no filesystem real em <code>{docRoot}/{currentPath}</code>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
              <Upload className="h-6 w-6" />
            </div>
            <h5 className="font-bold text-sm text-foreground">Upload de Arquivos & Pacotes .ZIP</h5>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Arraste arquivos ou clique para selecionar do computador. Os arquivos são salvos diretamente em <code>{docRoot}/{currentPath}</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
