import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth, useIsStaff, useProfile } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { useTheme } from "@/hooks/use-theme";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { logSessionEvent } from "@/lib/audit.functions";

import {
  ADMIN_SECTIONS,
  CLIENT_SECTIONS,
  NotificationMenu,
  NotificationItem,
  AppShellBanners,
  AppShellSidebar,
} from "./shell";

export { ADMIN_SECTIONS, CLIENT_SECTIONS };
export type { NavLink, NavSection, IconType } from "./shell";

export function AppShell({
  breadcrumb,
  breadcrumbs,
  children,
  area,
  containerClassName,
  cardClassName,
}: {
  breadcrumb?: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  children: ReactNode;
  /** Força a área do layout. Por padrão é inferido pelo papel do usuário. */
  area?: "admin" | "client";
  containerClassName?: string;
  cardClassName?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const renderedBreadcrumb = breadcrumb || (breadcrumbs ? (
    <div className="flex items-center gap-2">
      {breadcrumbs.map((b, idx) => (
        <span key={idx} className="flex items-center gap-2">
          {idx > 0 && <span className="opacity-40">/</span>}
          {b.href ? (
            <Link to={b.href} className="hover:text-foreground transition-colors">
              {b.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{b.label}</span>
          )}
        </span>
      ))}
    </div>
  ) : null);

  const { isStaff, isLoading: isStaffLoading } = useIsStaff();
  const { user, impersonatedClientId, setImpersonatedClientId } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useProfile();

  useEffect(() => {
    // Só redireciona se não for staff, não estiver carregando o perfil/staff,
    // o perfil explicitamente não estiver completo e não estivermos nas rotas permitidas.
    const isAuthRoute = pathname.startsWith("/auth") || pathname === "/complete-profile";
    const needsCompletion = user && !isStaff && !isProfileLoading && !isStaffLoading && profile && !(profile as any).registration_completed;

    if (needsCompletion && !isAuthRoute) {
      void navigate({ to: "/complete-profile" });
    }
  }, [user, profile, pathname, navigate, isStaff, isProfileLoading, isStaffLoading]);

  const branding = useBranding();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isAdminArea = area ? area === "admin" : (user ? (isStaff && pathname.startsWith("/admin")) : false);
  const queryClient = useQueryClient();
  const [hideBanner, setHideBanner] = useState(false);

  const isCheckout = pathname.startsWith("/checkout");
  const isGuest = !user;
  const hideSidebar = isCheckout && isGuest;
  const sections = isAdminArea ? ADMIN_SECTIONS : CLIENT_SECTIONS;
  const homeTo = isAdminArea ? "/admin" : "/dashboard";

  const { data: overdueInvoices } = useQuery({
    queryKey: ["overdue-invoices", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("invoices")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .lt("due_date", new Date().toISOString());
      return data || [];
    },
    enabled: !!user && !isAdminArea,
  });

  const hasOverdue = Boolean(overdueInvoices && overdueInvoices.length > 0);

  const { data: notifications, refetch: refetchNotifications } = useQuery<NotificationItem[]>({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("id, created_at, action, description, metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (error) return [];
        return (data || []).map((l: any) => ({
          id: l.id,
          title: (l.metadata as any)?.title || l.action || "Notificação",
          message: l.description || "Nova atualização",
          link: (l.metadata as any)?.link || null,
          read: (l.metadata as any)?.read ?? false,
          created_at: l.created_at,
        }));
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchNotifications]);

  const markAsRead = async (id: string) => {
    refetchNotifications();
  };

  const name = profile?.full_name ?? user?.email ?? (user ? "Conta" : "Visitante");
  const initials = name.slice(0, 2).toUpperCase();

  async function signOut() {
    await logSessionEvent({ data: { action: "logout", description: "Sessão encerrada pelo usuário" } });
    await supabase.auth.signOut();
    await navigate({ to: "/auth", search: { } });
  }

  const stopImpersonating = () => {
    void logSessionEvent({ data: {
      action: "impersonation.ended",
      description: "Administrador encerrou o modo cliente",
      entityType: "profile",
      entityId: impersonatedClientId ?? undefined,
    }});
    setImpersonatedClientId(null);
    queryClient.invalidateQueries();
    navigate({ to: "/admin/clients" });
  };

  const sidebarProps = {
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
    isStaff: Boolean(isStaff),
  };

  return (
    <div className={cn("min-h-screen bg-background flex flex-col", isCheckout && "h-screen overflow-hidden", isAdminArea && "h-screen overflow-hidden")}>
      <AppShellBanners
        impersonatedClientId={impersonatedClientId}
        clientName={profile?.full_name || profile?.email}
        stopImpersonating={stopImpersonating}
        hasOverdue={hasOverdue}
        hideBanner={hideBanner}
        setHideBanner={setHideBanner}
      />

      {/* Header Mobile */}
      <header className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:hidden pointer-events-auto">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 border-none rounded-r-3xl overflow-hidden">
              <AppShellSidebar
                {...sidebarProps}
                notificationAlign="start"
                notificationSide="bottom"
              />
            </SheetContent>
          </Sheet>
          <Link to={homeTo} className="flex items-center">
            <img
              src={branding.logo_url || "/images/logo-branco.webp"}
              alt={branding.app_name}
              className={cn(
                "h-7 w-auto max-w-[130px] object-contain",
                (!branding.logo_url || branding.logo_url.includes("logo-branco") || branding.logo_url === "/images/logo.webp") && "invert dark:invert-0"
              )}
            />
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationMenu
            notifications={notifications}
            unreadCount={unreadCount}
            hasOverdue={hasOverdue}
            markAsRead={markAsRead}
            align="end"
            side="bottom"
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {!hideSidebar && (
          <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar overflow-hidden lg:flex">
            <AppShellSidebar
              {...sidebarProps}
              notificationAlign="start"
              notificationSide="right"
            />
          </aside>
        )}

        <main className={cn("min-w-0 flex-1 px-3 py-4 lg:px-6 lg:py-6 overflow-y-auto", containerClassName)}>
          <div className={cn("rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)] lg:p-6", cardClassName)}>
            {renderedBreadcrumb && (
              <header className="flex items-center justify-between gap-4 pb-3 mb-4 border-b border-border/50 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">{renderedBreadcrumb}</div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <NotificationMenu
                    notifications={notifications}
                    unreadCount={unreadCount}
                    hasOverdue={hasOverdue}
                    markAsRead={markAsRead}
                    align="end"
                    side="bottom"
                  />
                </div>
              </header>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
