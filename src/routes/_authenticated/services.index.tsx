import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutPanelLeft, Search, Store, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getDASSOUrl } from "@/lib/support.functions";
import { useAuth } from "@/hooks/use-auth";

import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/services/")({
  head: () => ({
    meta: [
      { title: "Meus Serviços — HostPanel" },
      {
        name: "description",
        content: "Gerencie seus serviços de hospedagem ativos.",
      },
    ],
  }),
  component: ClientServicesPage,
});

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-warning/20 text-orange-600" },
  active: { label: "Ativo", color: "bg-brand/20 text-brand" },
  suspended: { label: "Suspenso", color: "bg-destructive/20 text-destructive" },
  terminated: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
};

function ClientServicesPage() {
  const [term, setTerm] = useState("");
  const { user, impersonatedClientId } = useAuth();
  const effectiveUserId = impersonatedClientId || user?.id;

  const services = useQuery({
    queryKey: ["client-services", effectiveUserId],
    enabled: Boolean(effectiveUserId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          products (
            name,
            directadmin_package
          )
        `)
        .eq("user_id", effectiveUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });


  const filtered = (services.data ?? []).filter((svc: any) => {
    const search = term.trim().toLowerCase();
    const domain = svc.domain?.toLowerCase() ?? "";
    const productName = svc.products?.name?.toLowerCase() ?? "";
    return domain.includes(search) || productName.includes(search) || svc.id.includes(search);
  });

  return (
    <AppShell
      area="client"
      breadcrumb={
        <>
          <span className="flex items-center gap-2">
            <Store className="size-4" />
            Minha conta
          </span>
          <span>/</span>
          <span className="flex items-center gap-2 font-medium text-foreground">
            <LayoutPanelLeft className="size-4" />
            Meus serviços
          </span>
        </>
      }
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Meus serviços</h1>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar por domínio ou produto"
            className="h-11 rounded-xl pl-9"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {services.isLoading ? (
          [0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
            Nenhum serviço encontrado
          </div>
        ) : (
          filtered.map((svc: any) => {
            const status = STATUS_LABELS[svc.status] || { label: svc.status, color: "bg-muted" };
            return (
              <div
                key={svc.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-[var(--shadow-card)]"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "flex size-10 items-center justify-center rounded-xl",
                      svc.status === 'active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    )}>
                      <Store className="size-5" />
                    </div>
                    <Badge variant="outline" className={cn("rounded-full border-none px-3 text-[10px] font-bold uppercase", status.color)}>
                      {status.label}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-bold text-foreground">{svc.products?.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground truncate">
                      {svc.domain || "Sem domínio associado"}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs">
                    <div>
                      <p className="text-muted-foreground uppercase font-medium">Ciclo</p>
                      <p className="mt-0.5 font-semibold text-foreground uppercase">{svc.billing_cycle}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase font-medium">Próx. Vencimento</p>
                      <p className="mt-0.5 font-semibold text-foreground">
                        {svc.next_due_date ? new Date(svc.next_due_date).toLocaleDateString("pt-BR") : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/30 p-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl bg-background border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent group-hover:border-brand/50"
                    asChild
                  >
                    <Link 
                      to="/services/$serviceId" 
                      params={{ serviceId: svc.id }}
                    >
                      Gerenciar
                    </Link>
                  </Button>
                  {svc.status === 'active' && svc.username && svc.server_id && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl border-brand/20 text-brand hover:bg-brand/5"
                      onClick={async () => {
                        const promise = (async () => {
                          const url = await getDASSOUrl({ data: { serverId: svc.server_id, username: svc.username, redirectUrl: '/' } });
                          window.open(url, '_blank');
                          return url;
                        })();

                        toast.promise(promise, {
                          loading: 'Gerando acesso...',
                          success: 'Redirecionando...',
                          error: (err) => `Erro: ${err.message}`
                        });
                      }}
                    >
                      <ExternalLink className="size-3 mr-1" />
                      Painel
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
