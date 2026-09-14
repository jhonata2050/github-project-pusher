import { Link } from "@tanstack/react-router";
import { Gauge, Store, PanelsTopLeft, ShieldAlert } from "lucide-react";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { cn } from "@/lib/utils";
import type { NavSection } from "./nav-config";
import { SidebarSection } from "./SidebarSection";
import { NotificationMenu, NotificationItem } from "./NotificationMenu";
import { AppShellUserMenu } from "./AppShellUserMenu";
import { AppShellBalanceCard } from "./AppShellBalanceCard";

export interface AppShellSidebarProps {
  homeTo: string;
  branding: {
    logo_url?: string | null | undefined;
    app_name?: string | undefined;
  };
  notifications: NotificationItem[] | undefined;
  unreadCount: number;
  hasOverdue: boolean;
  markAsRead: (id: string) => Promise<void>;
  isAdminArea: boolean;
  profile: any;
  sections: NavSection[];
  pathname: string;
  user: any;
  name: string;
  initials: string;
  resolvedTheme: string;
  toggleTheme: () => void;
  signOut: () => Promise<void>;
  isStaff: boolean;
  notificationAlign?: "start" | "end" | "center" | undefined;
  notificationSide?: "bottom" | "right" | "top" | "left" | undefined;
}

export function AppShellSidebar({
  homeTo,
  branding,
  notifications,
  unreadCount,
  hasOverdue,
  markAsRead,
  isAdminArea,
  profile,
  sections,
  pathname,
  user,
  name,
  initials,
  resolvedTheme,
  toggleTheme,
  signOut,
  isStaff,
  notificationAlign = "start",
  notificationSide = "right",
}: AppShellSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar px-3 py-4">
      {/* Top Header com Logo, Theme e Notificações */}
      <div className="flex items-center justify-between px-2 pb-4">
        <Link
          to={homeTo}
          className="flex min-w-0 items-center group transition-opacity hover:opacity-90 py-1"
        >
          <img
            src={branding.logo_url || "/images/logo-branco.webp"}
            alt={branding.app_name || "Painel"}
            className={cn(
              "h-8 w-auto max-w-[150px] object-contain",
              (!branding.logo_url || branding.logo_url.includes("logo-branco") || branding.logo_url === "/images/logo.webp") && "invert dark:invert-0"
            )}
          />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationMenu
            notifications={notifications}
            unreadCount={unreadCount}
            hasOverdue={hasOverdue}
            markAsRead={markAsRead}
            align={notificationAlign}
            side={notificationSide}
          />
        </div>
      </div>

      {/* Card de Identificação e Saldo em Conta */}
      <AppShellBalanceCard isAdminArea={isAdminArea} profile={profile} />

      {/* Navegação Principal */}
      <nav className="mt-3 flex-1 space-y-1 overflow-y-auto">
        <Link
          to={homeTo}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
            pathname === homeTo
              ? "bg-primary font-medium text-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent",
          )}
        >
          <Gauge className="size-4" />
          {isAdminArea ? "Painel administrativo" : "Painel"}
        </Link>

        {!isAdminArea && (
          <Link
            to="/checkout"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              pathname === "/checkout" || pathname === "/plans"
                ? "bg-primary font-medium text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <Store className="size-4" />
            Contratar planos
          </Link>
        )}

        {sections.map((section) => (
          <SidebarSection key={section.label} section={section} pathname={pathname} />
        ))}
      </nav>

      {/* Rodapé com Alternância Staff e Menu do Usuário */}
      <div className="mt-auto space-y-1 border-t border-sidebar-border pt-3">
        {isStaff && pathname.startsWith("/admin") && (
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <PanelsTopLeft className="size-4 text-muted-foreground" />
            Ver como cliente
          </Link>
        )}
        {isStaff && !pathname.startsWith("/admin") && (
          <Link
            to="/admin"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ShieldAlert className="size-4 text-muted-foreground" />
            Ir para administração
          </Link>
        )}

        <AppShellUserMenu
          user={user}
          name={name}
          initials={initials}
          resolvedTheme={resolvedTheme}
          toggleTheme={toggleTheme}
          signOut={signOut}
        />
      </div>
    </div>
  );
}
