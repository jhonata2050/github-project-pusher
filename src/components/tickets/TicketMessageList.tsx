import { Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketMessageListProps } from "./types";

export function TicketMessageList({ messages, scrollRef }: TicketMessageListProps) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6 bg-muted/5">
      {messages.map((msg) => {
        const isStaffMsg = msg.is_staff;
        const isSystemMsg = msg.message?.startsWith("ℹ️ [Sistema]");
        
        if (isSystemMsg) {
          return (
            <div key={msg.id} className="flex justify-center my-2">
              <div className="px-4 py-1.5 rounded-full bg-secondary/80 text-[11px] text-muted-foreground border border-border/50">
                {msg.message} • {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        }

        return (
          <div 
            key={msg.id} 
            className={cn(
              "w-full flex",
              isStaffMsg ? "justify-start" : "justify-end"
            )}
          >
            <div className="flex gap-3 max-w-[85%] items-end">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                isStaffMsg ? "bg-primary text-primary-foreground border-primary order-1" : "bg-slate-100 text-slate-600 border-slate-200 order-2"
              )}>
                {isStaffMsg ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div className={cn(
                "flex flex-col min-w-0",
                isStaffMsg ? "order-2 items-start" : "order-1 items-end"
              )}>
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm leading-snug shadow-sm",
                  isStaffMsg 
                    ? "bg-primary/10 text-foreground border border-primary/20 rounded-bl-none" 
                    : "bg-card text-foreground border border-border rounded-br-none"
                )}>
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.attachments.map((url, idx) => (
                        <a 
                          key={idx} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                        >
                          <img src={url} alt="Attachment" className="h-20 w-20 object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <p className={cn(
                  "text-[10px] text-muted-foreground mt-1 px-1",
                  isStaffMsg ? "text-left font-bold text-primary" : "text-right"
                )}>
                  {isStaffMsg ? "Equipe de suporte Eqsam" : (msg.profile?.full_name || "Cliente")} • {new Date(msg.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
