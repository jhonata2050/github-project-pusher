import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsStaff, useRoles } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { logSessionEvent } from "@/lib/audit.functions";


export const Route = createFileRoute("/_authenticated/admin")({
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
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Área restrita</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta área é exclusiva da administração da plataforma. Seu acesso não autorizado foi registrado.
          </p>

          <Button onClick={() => navigate({ to: "/dashboard" })} className="mt-4 rounded-xl">
            Voltar para o Painel
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
