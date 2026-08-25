import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  Maximize2,
  Minimize2,
  FileCode,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { IFileReadResult } from "@/lib/file-manager/types";

interface CodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileData: IFileReadResult | null;
  onSave: (path: string, content: string, expectedSha256?: string, force?: boolean) => Promise<{ sha256: string; mtime: string }>;
  onReload: (path: string) => Promise<IFileReadResult>;
}

export function CodeEditorModal({
  isOpen,
  onClose,
  fileData,
  onSave,
  onReload,
}: CodeEditorModalProps) {
  const [content, setContent] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [currentSha256, setCurrentSha256] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Inicializa o conteúdo quando o arquivo é aberto
  useEffect(() => {
    if (fileData) {
      setContent(fileData.content || "");
      setInitialContent(fileData.content || "");
      setCurrentSha256(fileData.sha256 || "");
      setIsDirty(false);
    }
  }, [fileData]);

  // Atualiza flag de modificado
  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    setIsDirty(newVal !== initialContent);
  };

  // Função de salvamento com detecção de concorrência
  const handleSave = useCallback(
    async (force: boolean = false) => {
      if (!fileData || isSaving) return;
      setIsSaving(true);
      try {
        const result = await onSave(fileData.path, content, currentSha256, force);
        setCurrentSha256(result.sha256);
        setInitialContent(content);
        setIsDirty(false);
        setConflictModalOpen(false);
        toast.success(`✓ Arquivo ${fileData.name} salvo com sucesso no servidor!`);
      } catch (err: any) {
        if (err.message?.includes("CONCURRENCY_CONFLICT") || err.message?.includes("concorrência")) {
          setConflictModalOpen(true);
        } else {
          toast.error("Erro ao salvar arquivo: " + (err.message || "Erro desconhecido"));
        }
      } finally {
        setIsSaving(false);
      }
    },
    [fileData, content, currentSha256, initialContent, isSaving, onSave]
  );

  // Atalho de teclado Ctrl+S e Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleSave]);

  // Fechamento seguro com alerta de alterações não salvas
  const handleSafeClose = () => {
    if (isDirty) {
      if (confirm("Você possui alterações não salvas. Deseja realmente fechar o editor e descartar as alterações?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Busca e Substituição
  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const count = (content.match(regex) || []).length;
    const newContent = content.replace(regex, replaceQuery);
    handleContentChange(newContent);
    toast.success(`${count} ocorrência(s) substituída(s).`);
  };

  // Cálculo de linhas para o gutter
  const lineCount = content.split("\n").length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  if (!fileData) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleSafeClose()}>
        <DialogContent
          className={`flex flex-col p-0 overflow-hidden bg-[#1e1e1e] text-zinc-100 border-zinc-800 ${
            isFullscreen
              ? "fixed inset-0 w-screen h-screen max-w-none rounded-none"
              : "rounded-3xl max-w-5xl h-[88vh]"
          }`}
        >
          {/* Barra de Título Superior */}
          <DialogHeader className="p-4 px-6 border-b border-zinc-800 bg-[#252526] flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <FileCode className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-sm font-bold font-mono truncate text-white">
                    {fileData.name}
                  </DialogTitle>
                  {isDirty ? (
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] py-0 px-2 font-bold animate-pulse">
                      ● Não Salvo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] py-0 px-2 font-bold">
                      ✓ Salvo
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[10px] py-0 px-1.5 font-mono uppercase">
                    {fileData.mimeType.split("/").pop()}
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono truncate">
                  /var/www/html/{fileData.path} • {fileData.sizeFormatted} • {lineCount} linhas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSearchOpen((p) => !p)}
                className="rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 px-2.5 text-xs gap-1.5"
                title="Localizar e Substituir (Ctrl+F)"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsFullscreen((p) => !p)}
                className="rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 w-8 p-0"
                title={isFullscreen ? "Restaurar" : "Tela Cheia"}
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>

              <Button
                size="sm"
                onClick={() => handleSave(false)}
                disabled={isSaving || !isDirty}
                className="rounded-xl font-bold text-xs h-8 px-3.5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                title="Salvar alterações no servidor (Ctrl+S)"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Salvar (Ctrl+S)</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleSafeClose}
                className="rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 h-8 w-8 p-0"
                title="Fechar editor"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Barra de Busca e Substituição */}
          {searchOpen && (
            <div className="p-3 bg-[#2d2d2d] border-b border-zinc-800 flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                <span className="text-zinc-400 font-mono">Buscar:</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Texto a localizar..."
                  className="bg-[#1e1e1e] text-white px-2.5 py-1 rounded-lg border border-zinc-700 text-xs flex-1 outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                <span className="text-zinc-400 font-mono">Substituir:</span>
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Novo texto..."
                  className="bg-[#1e1e1e] text-white px-2.5 py-1 rounded-lg border border-zinc-700 text-xs flex-1 outline-none focus:border-primary"
                />
              </div>
              <Button
                size="sm"
                onClick={handleReplaceAll}
                disabled={!searchQuery}
                className="rounded-lg h-7 px-3 text-xs font-semibold bg-zinc-700 hover:bg-zinc-600"
              >
                Substituir Tudo
              </Button>
            </div>
          )}

          {/* Área de Edição com Gutter de Numeração de Linhas */}
          <div className="flex-1 flex overflow-hidden bg-[#1e1e1e]">
            {/* Numeração de Linhas */}
            <div className="w-12 bg-[#1e1e1e] border-r border-zinc-800 py-3 select-none text-right pr-2 text-[12px] font-mono text-zinc-600 overflow-hidden leading-[1.5rem]">
              {lineNumbers.map((num) => (
                <div key={num}>{num}</div>
              ))}
            </div>

            {/* Textarea de Código */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              spellCheck={false}
              className="flex-1 p-3 bg-transparent text-zinc-100 font-mono text-[13px] leading-[1.5rem] resize-none outline-none border-none overflow-y-auto whitespace-pre tab-[2]"
              style={{ tabSize: 2 }}
              placeholder="// Digite ou cole o código aqui..."
            />
          </div>

          {/* Barra de Status Inferior */}
          <div className="p-2 px-4 bg-[#007acc] text-white text-[11px] font-mono flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <span>UTF-8</span>
              <span>LF</span>
              <span>{fileData.name.split(".").pop()?.toUpperCase() || "TEXT"}</span>
            </div>
            <div className="flex items-center gap-4">
              <span>{lineCount} linhas</span>
              <span>{content.length} caracteres</span>
              <span className="opacity-90">Pressione <strong>Ctrl + S</strong> para salvar</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Conflito de Concorrência */}
      <Dialog open={conflictModalOpen} onOpenChange={setConflictModalOpen}>
        <DialogContent className="rounded-3xl max-w-md bg-zinc-950 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Conflito de Concorrência Detectado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-zinc-300 py-2">
            <p>
              O arquivo <strong>{fileData.name}</strong> foi alterado no servidor por outro processo ou usuário desde que você o abriu.
            </p>
            <p className="text-zinc-400">
              Para evitar perda acidental de dados, escolha como deseja prosseguir:
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={async () => {
                const refreshed = await onReload(fileData.path);
                setContent(refreshed.content);
                setInitialContent(refreshed.content);
                setCurrentSha256(refreshed.sha256);
                setIsDirty(false);
                setConflictModalOpen(false);
                toast.success("Arquivo recarregado com a versão mais recente do servidor.");
              }}
              className="rounded-xl font-bold bg-primary text-primary-foreground"
            >
              🔄 Recarregar do Servidor (Descartar locais)
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSave(true)}
              className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              ⚠️ Sobrescrever no Servidor (Forçar)
            </Button>
            <Button
              variant="outline"
              onClick={() => setConflictModalOpen(false)}
              className="rounded-xl border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar (Continuar editando localmente)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
