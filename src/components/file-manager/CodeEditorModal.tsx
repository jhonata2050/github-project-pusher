import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  EditorHeader,
  EditorSearchBar,
  EditorBinaryWarning,
  EditorStatusBar,
  EditorConflictDialog,
  type CodeEditorModalProps,
} from "./editor";

export function CodeEditorModal({
  isOpen,
  onClose,
  fileData,
  documentRoot,
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

  // Detecção de arquivo binário ou compactado
  const ext = fileData?.name.split(".").pop()?.toLowerCase() || "";
  const isArchiveFile = ["zip", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz"].includes(ext);
  const isBinaryFile =
    isArchiveFile ||
    fileData?.encoding === "base64" ||
    [
      "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "tiff",
      "mp4", "webm", "mp3", "wav", "ogg", "flac", "aac",
      "pdf", "exe", "bin", "iso", "dmg", "apk", "jar", "wasm", "db", "sqlite",
    ].includes(ext);

  // Cálculo de linhas para o gutter (limitado a 2000 para prevenir travamentos com arquivos gigantes)
  const lineCount = isBinaryFile ? 0 : content.split("\n").length;
  const lineNumbers = useMemo(
    () => (isBinaryFile ? [] : Array.from({ length: Math.min(Math.max(lineCount, 1), 2000) }, (_, i) => i + 1)),
    [lineCount, isBinaryFile]
  );

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
          <EditorHeader
            fileData={fileData}
            documentRoot={documentRoot}
            isDirty={isDirty}
            lineCount={lineCount}
            isBinaryFile={isBinaryFile}
            isFullscreen={isFullscreen}
            isSaving={isSaving}
            onToggleSearch={() => setSearchOpen((p) => !p)}
            onToggleFullscreen={() => setIsFullscreen((p) => !p)}
            onSave={() => handleSave(false)}
            onClose={handleSafeClose}
          />

          {!isBinaryFile && searchOpen && (
            <EditorSearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              replaceQuery={replaceQuery}
              setReplaceQuery={setReplaceQuery}
              onReplaceAll={handleReplaceAll}
            />
          )}

          {isBinaryFile ? (
            <EditorBinaryWarning
              fileData={fileData}
              isArchiveFile={isArchiveFile}
              onClose={handleSafeClose}
            />
          ) : (
            <div className="flex-1 flex overflow-hidden bg-[#1e1e1e]">
              <div className="w-12 bg-[#1e1e1e] border-r border-zinc-800 py-3 select-none text-right pr-2 text-[12px] font-mono text-zinc-600 overflow-hidden leading-[1.5rem]">
                {lineNumbers.map((num) => (
                  <div key={num}>{num}</div>
                ))}
              </div>

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
          )}

          <EditorStatusBar
            fileData={fileData}
            lineCount={lineCount}
            contentLength={content.length}
          />
        </DialogContent>
      </Dialog>

      <EditorConflictDialog
        isOpen={conflictModalOpen}
        onOpenChange={setConflictModalOpen}
        fileData={fileData}
        onReload={async () => {
          const refreshed = await onReload(fileData.path);
          setContent(refreshed.content);
          setInitialContent(refreshed.content);
          setCurrentSha256(refreshed.sha256);
          setIsDirty(false);
          setConflictModalOpen(false);
          toast.success("Arquivo recarregado com a versão mais recente do servidor.");
        }}
        onForceOverwrite={() => handleSave(true)}
        onCancel={() => setConflictModalOpen(false)}
      />
    </>
  );
}
