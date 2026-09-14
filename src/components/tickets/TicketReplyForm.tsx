import { Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TicketReplyFormProps } from "./types";

export function TicketReplyForm({
  ticketStatus,
  message,
  attachments,
  uploading,
  isSubmitting,
  onMessageChange,
  onFileUpload,
  onRemoveAttachment,
  onSubmit,
  onReopen,
  fileInputRef,
}: TicketReplyFormProps) {
  const isClosed = ticketStatus === "closed";

  return (
    <div className="p-4 border-t border-border bg-card">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((file, idx) => (
            <div key={idx} className="relative group">
              <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border">
                {file.type.startsWith("image/") ? (
                  <img src={URL.createObjectURL(file)} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <Paperclip className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <button 
                type="button"
                onClick={() => onRemoveAttachment(idx)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={onSubmit} className="relative flex flex-col gap-2">
        <div className="relative">
          <Textarea
            placeholder={isClosed ? "Este ticket está fechado. Clique em 'Reabrir Ticket' para enviar uma mensagem." : "Digite sua resposta aqui..."}
            className="min-h-[100px] rounded-2xl border-none bg-muted/30 focus-visible:ring-primary resize-none pr-12"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            disabled={isClosed || uploading}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <input 
              type="file" 
              multiple 
              accept="image/*,.pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={onFileUpload}
            />
            <Button 
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl text-muted-foreground hover:text-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isClosed || uploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button 
              type="submit" 
              size="icon" 
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={(!message.trim() && attachments.length === 0) || isSubmitting || isClosed || uploading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
      {uploading && (
        <p className="text-[10px] text-primary animate-pulse mt-1">Enviando anexos...</p>
      )}
      {isClosed && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <p className="text-center text-xs text-muted-foreground italic">Este ticket foi concluído.</p>
          <Button 
            variant="link" 
            size="sm" 
            onClick={onReopen}
            className="text-xs text-primary p-0 h-auto font-semibold"
          >
            Reabrir chamado
          </Button>
        </div>
      )}
    </div>
  );
}
