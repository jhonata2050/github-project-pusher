import React from "react";
import { Button } from "@/components/ui/button";
import { FolderArchive } from "lucide-react";
import type { IFileReadResult } from "@/lib/file-manager/types";

interface EditorBinaryWarningProps {
  fileData: IFileReadResult;
  isArchiveFile: boolean;
  onClose: () => void;
}

export function EditorBinaryWarning({
  fileData,
  isArchiveFile,
  onClose,
}: EditorBinaryWarningProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#1e1e1e] text-zinc-400 gap-3 select-none">
      <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
        <FolderArchive className="h-8 w-8" />
      </div>
      <h3 className="text-base font-bold text-white">
        {isArchiveFile ? "Arquivo Compactado (ZIP)" : "Arquivo Binário"}
      </h3>
      <p className="text-xs max-w-md text-zinc-400 leading-relaxed">
        O arquivo <strong className="text-zinc-200">{fileData.name}</strong> ({fileData.sizeFormatted}) não pode ser aberto como texto para evitar travamentos no navegador e corrupção de dados.
      </p>
      {isArchiveFile && (
        <p className="text-xs text-amber-400/90 font-medium">
          💡 Utilize o botão <strong>"Extrair ZIP"</strong> no gerenciador de arquivos para descompactar o conteúdo.
        </p>
      )}
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onClose}
          className="rounded-xl border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-300"
        >
          Fechar
        </Button>
      </div>
    </div>
  );
}
