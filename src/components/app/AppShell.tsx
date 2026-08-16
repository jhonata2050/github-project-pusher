import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  X,
  ChevronDown,
  Cog,
  Gauge,
  Globe,
  LayoutPanelLeft,
  LifeBuoy,
  History,
  LogOut,
  Mail,
  Monitor,
  MoreVertical,
  Package,
  PanelsTopLeft,
  Receipt,
  RefreshCw,
  Server,
  ShoppingBag,
  Store,
  Ticket,
  User as UserIcon,
  Users,
  Wallet,
  LogOut as LogOutIcon,
  Menu,
  Palette,
} from "lucide-react";

import { useState, type ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth, useIsStaff, useProfile } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { logSessionEvent } from "@/lib/audit.functions";

type IconType = typeof Package;
type NavLink = { label: string; to: string; icon?: IconType };
type NavSection = { label: string; icon: IconType; links: NavLink[] };

const ADMIN_SECTIONS: NavSection[] = [
  {
    label: "Catálogo",
    icon: ShoppingBag,
    links: [
      { label: "Produtos e planos", to: "/admin/products", icon: Package },
      { label: "Cupons e promoções", to: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    links: [{ label: "Faturas", to: "/admin/invoices", icon: Receipt }],
  },
  {
    label: "Clientes",
    icon: Users,
    links: [
      { label: "Contas de clientes", to: "/admin/clients", icon: Users },
      { label: "Servidores VPS", to: "/admin/vps", icon: Monitor },
    ],
  },
  {
    label: "Atendimento",
    icon: LifeBuoy,
    links: [{ label: "Tickets", to: "/admin/tickets", icon: LifeBuoy }],
  },
  {
    label: "Sistema",
    icon: Cog,
    links: [
      { label: "Servidores DirectAdmin", to: "/admin/servers", icon: Server },
      { label: "Financeiro e Gateways", to: "/admin/finance", icon: Wallet },
      { label: "E-mails e SMTP", to: "/admin/emails", icon: Mail },
      { label: "Domínios", to: "/admin/domains", icon: Globe },
      { label: "Logs do Sistema", to: "/admin/logs", icon: History },
      { label: "Branding e Visual", to: "/admin", icon: Palette },
      { label: "Importador WHMCS", to: "/admin/import", icon: RefreshCw },
    ],
  },
];

const CLIENT_SECTIONS: NavSection[] = [
  {
    label: "Meus serviços",
    icon: Server,
    links: [
      { label: "Hospedagens", to: "/services", icon: LayoutPanelLeft },
      { label: "Servidores VPS", to: "/vps", icon: Server },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    links: [{ label: "Minhas faturas", to: "/invoices", icon: Receipt }],
  },
  {
    label: "Minha conta",
    icon: UserIcon,
    links: [
      { label: "Meus dados", to: "/profile", icon: UserIcon },
      { label: "Suporte", to: "/tickets", icon: LifeBuoy },
    ],
  },
];

function SidebarSection({ section, pathname }: { section: NavSection; pathname: string }) {
  const hasActive = section.links.some((l) => pathname.startsWith(l.to));
  const [open, setOpen] = useState(hasActive);
  const Icon = section.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
      >
        <span className="flex items-center gap-3">
          <Icon className="size-4 text-muted-foreground" />
          {section.label}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && section.links.length > 0 && (
        <div className="ml-3 mt-1 space-y-1 border-l border-sidebar-border pl-3">
          {section.links.map((link) => {
            const LinkIcon = link.icon ?? Package;
            const active = pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <LinkIcon className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppShell({
  breadcrumb,
  children,
  area,
}: {
  breadcrumb: ReactNode;
  children: ReactNode;
  /** Força a área do layout. Por padrão é inferido pelo papel do usuário. */
  area?: "admin" | "client";
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isStaff } = useIsStaff();
  const { user, impersonatedClientId, setImpersonatedClientId } = useAuth();
  const { data: profile } = useProfile();
  const branding = useBranding();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hideBanner, setHideBanner] = useState(false);


  const isAdminArea = area ? area === "admin" : isStaff;
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

  const hasOverdue = overdueInvoices && overdueInvoices.length > 0;

  const name = profile?.full_name ?? user?.email ?? "Conta";
  const initials = name.slice(0, 2).toUpperCase();

  async function signOut() {
    await logSessionEvent({ data: { action: "logout", description: "Sessão encerrada pelo usuário" } });
    await supabase.auth.signOut();
    await navigate({ to: "/auth" });
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

  return (

    <div className="min-h-screen bg-background flex flex-col">
      {impersonatedClientId && (
        <div className="bg-brand p-3 text-center text-brand-foreground font-medium border-b border-brand/20 flex items-center justify-center gap-4">
          Você está visualizando o painel como cliente ({profile?.full_name || profile?.email}).
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={stopImpersonating}
            className="rounded-xl h-8 text-xs flex gap-2"
          >
            <LogOutIcon className="size-3" /> Sair do modo cliente
          </Button>
        </div>
      )}
      {hasOverdue && !hideBanner && (

        <div className="bg-destructive p-3 text-center text-destructive-foreground font-medium border-b border-brand/20 relative animate-in fade-in slide-in-from-top duration-300">
          Você possui faturas vencidas. Regularize seu débito para evitar suspensão dos serviços.
          <button 
            onClick={() => setHideBanner(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:hidden">

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <Menu className="size-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 border-none rounded-r-3xl overflow-hidden">
                <div className="flex h-full flex-col bg-sidebar px-3 py-4">
                  <div className="flex items-center justify-between px-2 pb-4">
                    <Link
                      to="/"
                      className={cn(
                        "flex items-center h-12",
                        branding.logo_url
                          ? "w-full justify-start rounded-2xl px-2"
                          : "size-8 justify-center rounded-full bg-brand",
                      )}
                    >
                      {branding.logo_url ? (
                        <img
                          src={branding.logo_url}
                          alt={branding.app_name}
                          className="h-full w-auto max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-sm font-bold text-brand-foreground">{branding.app_name.charAt(0)}</span>
                      )}
                    </Link>
                  </div>
                  <nav className="flex-1 space-y-1 overflow-y-auto">
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
                        to="/"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                      >
                        <Store className="size-4" />
                        Contratar planos
                      </Link>
                    )}
                    {sections.map((section) => (
                      <SidebarSection key={section.label} section={section} pathname={pathname} />
                    ))}
                  </nav>
                  <div className="mt-auto space-y-1 border-t border-sidebar-border pt-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                        >
                          <Avatar className="size-7">
                            <AvatarFallback className="bg-accent text-xs text-accent-foreground">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="flex-1 truncate text-left">{name}</span>
                          <MoreVertical className="size-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuItem asChild>
                          <Link to="/profile">
                            <UserIcon className="mr-2 size-4" />
                            Meus dados
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={signOut}>
                          <LogOut className="mr-2 size-4" />
                          Sair
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-lg font-semibold">{branding.app_name}</span>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground relative">
            <Bell className="size-5" />
            {hasOverdue && (
              <span className="absolute top-2 right-2 size-2 bg-destructive rounded-full border-2 border-background" />
            )}
          </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
          <div className="flex items-center justify-between px-2 pb-4">
            <Link
              to="/"
              className={cn(
                "flex min-w-0 items-center h-12 w-full",
                branding.logo_url
                  ? "justify-start rounded-2xl px-2"
                  : "size-8 justify-center overflow-hidden rounded-full bg-brand",
              )}
            >
              {branding.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt={branding.app_name}
                  className="h-full w-auto max-w-full object-contain"
                />
              ) : (
                <span className="text-sm font-bold text-brand-foreground">{branding.app_name.charAt(0)}</span>
              )}
            </Link>
            <PanelsTopLeft className="size-4 text-muted-foreground shrink-0" />
          </div>

          <div className="border-y border-sidebar-border py-3">
            <div className="rounded-xl px-2 py-1">
              {isAdminArea ? (
                <>
                  <p className="text-sm font-semibold text-sidebar-foreground">Administração</p>
                  <p className="text-xs text-muted-foreground">Acesso master da plataforma</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-sidebar-foreground">
                    {profile?.company_name ?? profile?.full_name ?? "Minha conta"}
                  </p>
                  <p className="text-xs text-muted-foreground">{profile?.tax_id ?? "Sem CPF/CNPJ cadastrado"}</p>
                </>
              )}
            </div>
          </div>

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
                to="/"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              >
                <Store className="size-4" />
                Contratar planos
              </Link>
            )}
            {sections.map((section) => (
              <SidebarSection key={section.label} section={section} pathname={pathname} />
            ))}
          </nav>

          <div className="space-y-1 border-t border-sidebar-border pt-3">
            {isStaff && (
              <Link
                to={isAdminArea ? "/dashboard" : "/admin"}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <PanelsTopLeft className="size-4 text-muted-foreground" />
                {isAdminArea ? "Ver como cliente" : "Ir para administração"}
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-accent text-xs text-accent-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-left">{name}</span>
                  <MoreVertical className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <UserIcon className="mr-2 size-4" />
                    Meus dados
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-3 py-4 lg:px-6 lg:py-6 lg:h-screen lg:overflow-y-auto">
          <header className="hidden items-center justify-between gap-4 pb-4 lg:flex">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">{breadcrumb}</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground relative">
                <Bell className="size-5" />
                {hasOverdue && (
                  <span className="absolute top-2 right-2 size-2 bg-destructive rounded-full border-2 border-background" />
                )}
              </Button>
            </div>
          </header>
          <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)] lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
