import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link?: string | null | undefined;
  read: boolean;
  created_at?: string | null | undefined;
}

export interface NotificationMenuProps {
  notifications: NotificationItem[] | undefined;
  unreadCount: number;
  hasOverdue: boolean;
  markAsRead: (id: string) => Promise<void>;
  align?: "start" | "end" | "center" | undefined;
  side?: "bottom" | "right" | "top" | "left" | undefined;
}

export function NotificationMenu({
  notifications,
  unreadCount,
  hasOverdue,
  markAsRead,
  align = "end",
  side = "bottom",
}: NotificationMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full text-muted-foreground relative hover:bg-brand/10 hover:text-brand transition-all flex items-center justify-center shrink-0"
          title="Notificações"
        >
          <Bell className="size-5 text-sidebar-foreground" />
          {(hasOverdue || unreadCount > 0) && (
            <span
              className="absolute top-1.5 right-1.5 size-2.5 bg-destructive rounded-full border-2 border-background animate-bounce"
              style={{ boxShadow: "0 0 8px oklch(0.6 0.2 25 / 0.6)" }}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} sideOffset={8} className="w-80 p-0 overflow-hidden rounded-2xl z-50">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-brand/20 text-brand px-2 py-0.5 rounded-full">
              {unreadCount} nova{unreadCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications && notifications.length > 0 ? (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                asChild
                className={cn(
                  "p-4 border-b border-border last:border-0 cursor-pointer focus:bg-accent",
                  !n.read && "bg-brand/5",
                )}
                onClick={() => markAsRead(n.id)}
              >
                {n.link ? (
                  <Link to={n.link} className="block w-full">
                    <div className="flex justify-between items-start gap-2">
                      <p
                        className={cn(
                          "text-sm",
                          !n.read ? "font-bold text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {n.title}
                      </p>
                      {!n.read && <div className="size-2 bg-brand rounded-full shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(n.created_at || "").toLocaleString("pt-BR")}
                    </p>
                  </Link>
                ) : (
                  <div className="w-full">
                    <div className="flex justify-between items-start gap-2">
                      <p
                        className={cn(
                          "text-sm",
                          !n.read ? "font-bold text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {n.title}
                      </p>
                      {!n.read && <div className="size-2 bg-brand rounded-full shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(n.created_at || "").toLocaleString("pt-BR")}
                    </p>
                  </div>
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-8 text-center">
              <Bell className="size-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
            </div>
          )}
        </div>
        {hasOverdue && (
          <div className="p-3 bg-destructive/10 border-t border-destructive/20">
            <p className="text-[11px] text-destructive font-medium text-center">
              Você possui faturas pendentes!
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
