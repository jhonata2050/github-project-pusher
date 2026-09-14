import React from "react";
import { Upload, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DatabaseHeaderProps } from "./types";

export const DatabaseHeader: React.FC<DatabaseHeaderProps> = ({
  importingFile,
  isImportPending,
  isServerBackupPending,
  fileInputRef,
  onFileUpload,
  onTriggerServerBackup,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Banco de Dados & Backups</h1>
        <p className="text-sm text-muted-foreground">
          Monitore conexões, realize backups locais/servidor e restaure dados com segurança.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onFileUpload} 
          accept=".json" 
          className="hidden" 
        />
        <Button 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()} 
          disabled={importingFile || isImportPending}
          className="rounded-xl flex gap-2"
        >
          <Upload className="size-4" />
          {importingFile || isImportPending ? "Restaurando..." : "Importar Backup (.json)"}
        </Button>
        <Button 
          onClick={onTriggerServerBackup} 
          disabled={isServerBackupPending}
          className="rounded-xl flex gap-2"
        >
          <RefreshCw className={`size-4 ${isServerBackupPending ? "animate-spin" : ""}`} />
          {isServerBackupPending ? "Salvando..." : "Fazer Backup Agora"}
        </Button>
      </div>
    </div>
  );
};
