import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import type { IFileInfo } from "@/lib/file-manager/types";

interface FilePropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: IFileInfo | null;
}

export function FilePropertiesModal({ isOpen, onClose, file }: FilePropertiesModalProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!file) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const properties = [
    { label: "Nome do Arquivo", value: file.name, key: "name" },
    { label: "Caminho Relativo", value: file.path, key: "path" },
    { label: "Caminho no Servidor", value: `/var/www/html/${file.path}`, key: "fullPath" },
    { label: "Tipo", value: file.type === "directory" ? "Diretório" : file.mimeType, key: "type" },
    { label: "Tamanho", value: `${file.sizeFormatted} (${file.size.toLocaleString("pt-BR")} bytes)`, key: "size" },
    { label: "Permissões Linux", value: `${file.permissions} (${file.rwx})`, key: "perms" },
    { label: "Última Modificação", value: new Date(file.mtime).toLocaleString("pt-BR"), key: "mtime" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-3xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" /> Propriedades do Arquivo
          </DialogTitle>
          <DialogDescription className="text-xs">
            Metadados e estatísticas reais do filesystem do servidor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="divide-y border rounded-2xl bg-muted/20 text-xs overflow-hidden">
            {properties.map((prop) => (
              <div key={prop.key} className="flex items-center justify-between p-3 gap-3">
                <span className="font-semibold text-muted-foreground shrink-0">{prop.label}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-foreground truncate">{prop.value}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => copyToClipboard(prop.value, prop.key)}
                    className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                    title="Copiar"
                  >
                    {copiedKey === prop.key ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={onClose} className="rounded-xl font-bold bg-primary">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
