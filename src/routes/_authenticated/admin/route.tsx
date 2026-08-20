import { createFileRoute, Outlet, useNavigate, useRouterState, redirect } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsStaff, useRoles } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { logSessionEvent } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    // Redundant security check on navigation (Server-Side)
    const { data: isAdmin, error } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin'
    });
    
    if (error || !isAdmin) {
      console.error('[Security] Admin area access denied (Server-Side) for user:', context.userId);
      throw redirect({
        to: '/dashboard',
        search: {
          error: 'Unauthorized access attempt logged'
        }
      });
    }
  },
  component: AdminLayout,
});


function AdminLayout() {
  const branding = useBranding();
  const { data: roles, error, isLoading: rolesLoading } = useRoles();
  const { isStaff, isLoading: staffLoading } = useIsStaff();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const loading = staffLoading || rolesLoading;

  useEffect(() => {
    if (!loading && !isStaff) {
      void logSessionEvent({
        data: {
          action: "security.unauthorized_access",
          description: `Tentativa de acesso à rota administrativa: ${pathname}`,
          entityType: "security_event",
          entityId: "unauthorized_admin_access"
        }
      });
    }
  }, [loading, isStaff, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen space-y-4 p-6">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    );
  }


  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center bg-background">
        <div className="max-w-sm p-8 rounded-3xl border-2 border-destructive/20 bg-destructive/5 animate-in fade-in zoom-in duration-300">
          <ShieldAlert className="mx-auto size-12 text-destructive animate-pulse" />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">Acesso Negado</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Esta área é exclusiva para administradores da **Eqsam Cloud**. 
            Sua tentativa de acesso não autorizado foi registrado para auditoria de segurança.
          </p>

          <Button 
            onClick={() => navigate({ to: "/dashboard" })} 
            className="mt-8 w-full rounded-2xl h-12 font-medium bg-foreground text-background hover:bg-foreground/90 transition-all"
          >
            Voltar para o Painel Seguro
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
