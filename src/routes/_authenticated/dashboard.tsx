import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gauge, Receipt, Server, Store } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu painel — HostPanel" },
      {
        name: "description",
        content: "Acompanhe seus serviços de hospedagem, faturas em aberto e atendimentos.",
      },
      { property: "og:title", content: "Meu painel — HostPanel" },
      { property: "og:description", content: "Seus serviços de hospedagem e faturas em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientDashboardPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function ClientDashboardPage() {
  const { user, impersonatedClientId } = useAuth();
  const { data: profile } = useProfile();
  const effectiveUserId = impersonatedClientId || user?.id;

  const stats = useQuery({
    queryKey: ["client-dashboard-stats", effectiveUserId],
    enabled: Boolean(effectiveUserId),
    queryFn: async () => {
      const [services, invoices] = await Promise.all([
        supabase.from("services").select("id, status").eq("user_id", effectiveUserId!),
        supabase.from("invoices").select("total_amount, status").eq("user_id", effectiveUserId!),
      ]);


      const pending = (invoices.data ?? []).filter((i) => i.status === "pending");
      return {
        activeServices: (services.data ?? []).filter((s) => s.status === "active").length,
        totalServices: services.data?.length ?? 0,
        pendingCount: pending.length,
        pendingTotal: pending.reduce((acc, i) => acc + Number(i.total_amount), 0),
      };
    },
  });

  return (
    <AppShell
      area="client"
      breadcrumb={
        <span className="flex items-center gap-2 text-base font-medium text-foreground">
          <Gauge className="size-4" />
          Meu painel
        </span>
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight">
        Olá, {profile?.full_name?.split(" ")[0] ?? "bem-vindo"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Aqui você acompanha suas hospedagens, faturas e atendimentos.
      </p>

      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Serviços ativos"
          value={stats.isLoading ? undefined : String(stats.data?.activeServices ?? 0)}
        />
        <KpiCard
          label="Faturas em aberto"
          value={stats.isLoading ? undefined : String(stats.data?.pendingCount ?? 0)}
        />
        <KpiCard
          label="Valor a pagar"
          value={stats.isLoading ? undefined : brl.format(stats.data?.pendingTotal ?? 0)}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border p-6">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Server className="size-4 text-muted-foreground" />
            Minhas hospedagens
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {stats.data?.totalServices
              ? `Você possui ${stats.data.totalServices} serviço(s) contratado(s).`
              : "Você ainda não tem serviços contratados."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="rounded-xl">
              <Link to="/services">Ver meus serviços</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/">
                <Store className="mr-2 size-4" />
                Contratar plano
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-6">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Receipt className="size-4 text-muted-foreground" />
            Financeiro
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pague suas faturas por Pix, cartão ou boleto direto no painel.
          </p>
          <Button asChild variant="outline" className="mt-4 rounded-xl">
            <Link to="/invoices">Ver minhas faturas</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({ label, value }: { label: string; value?: string | undefined }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-2 h-8 w-28" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      )}
    </div>
  );
}
