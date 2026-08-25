import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gauge, Monitor, Receipt, Server, Store, Wallet, Plus } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu painel — EQSAM CLOUD" },
      {
        name: "description",
        content: "Acompanhe seus serviços de hospedagem e instâncias EQSAM CLOUD.",
      },
      { property: "og:title", content: "Meu painel — EQSAM CLOUD" },
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
  const branding = useBranding();
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

  const currentBalance = Number(profile?.account_balance || 0);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Olá, {profile?.full_name?.split(" ")[0] ?? "bem-vindo"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aqui você acompanha seus serviços, faturas e atendimentos no painel {branding.app_name}.
          </p>
        </div>
        <Link to="/wallet">
          <Button className="rounded-2xl gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Wallet className="size-4" />
            Adicionar Saldo
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Saldo Disponível */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Saldo da Carteira</p>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <Wallet className="size-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{brl.format(currentBalance)}</p>
          <Link to="/wallet" className="text-[11px] font-semibold text-emerald-600 hover:underline mt-1">
            + Adicionar créditos
          </Link>
        </div>

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
        <div className="rounded-2xl border border-border p-6 flex flex-col">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Server className="size-4 text-muted-foreground" />
            Meus serviços
          </h2>
          <p className="mt-2 text-sm text-muted-foreground flex-1">
            {stats.data?.totalServices
              ? `Você possui ${stats.data.totalServices} serviço(s) contratado(s).`
              : "Você ainda não tem serviços contratados."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="rounded-xl">
              <Link to="/services">Ver serviços</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/vps">
                <Monitor className="mr-2 size-4" />
                Servidores VPS
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-6 flex flex-col justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Receipt className="size-4 text-muted-foreground" />
              Financeiro & Carteira
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Seu saldo é utilizado automaticamente para pagar e renovar seus serviços.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link to="/wallet">Minha Carteira</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/invoices">Ver faturas</Link>
            </Button>
          </div>
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
