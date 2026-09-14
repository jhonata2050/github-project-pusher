import { createFileRoute } from "@tanstack/react-router";
import { Layout, Clock } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { getAdminStats, getLeadSourceStats } from "@/lib/dashboard-admin.functions";
import {
  AdminStatCards,
  AdminStatCardsSkeleton,
  CriticalTicketsCard,
  ProvisioningAlertCard,
  FinancialPerformanceCard,
  OperationalShortcutsCard,
  SystemHealthCard,
  LeadSourceChartCard,
  ProvisioningAuditModal,
} from "@/components/admin/dashboard";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getAdminStats(),
    refetchInterval: 30000,
  });

  const { data: leadStats } = useQuery({
    queryKey: ["admin-lead-stats"],
    queryFn: () => getLeadSourceStats(),
  });

  if (isLoading) {
    return (
      <AppShell area="admin" breadcrumb={<span>Administração</span>}>
        <AdminStatCardsSkeleton />
      </AppShell>
    );
  }

  const hasCriticalAlerts =
    ((stats?.criticalTickets?.length ?? 0) > 0) ||
    ((stats?.errorServices?.length ?? 0) > 0);

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Layout className="size-4" />
          Painel Administrativo
        </span>
      }
    >
      <div className="mt-4 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
            <p className="text-muted-foreground text-sm">
              Métricas e estatísticas globais da plataforma EQSAM CLOUD.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-background/50 border-border/50 py-1 px-3 flex items-center gap-2 rounded-full text-[10px] text-muted-foreground font-medium"
            >
              <Clock className="size-3" />
              ATUALIZADO AGORA
            </Badge>
          </div>
        </div>

        {/* Alertas Críticos */}
        {hasCriticalAlerts && (
          <div className="grid gap-4 md:grid-cols-2">
            <CriticalTicketsCard
              tickets={stats?.criticalTickets}
              pendingCount={stats?.pendingTicketsCount}
            />
            <ProvisioningAlertCard
              services={stats?.errorServices}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSelectService={setSelectedServiceId}
            />
          </div>
        )}

        {/* Estatísticas Rápidas */}
        <AdminStatCards stats={stats} />

        <div className="grid gap-6 md:grid-cols-7">
          <FinancialPerformanceCard totalRevenue={stats?.totalRevenue} />

          <div className="col-span-full md:col-span-3 flex flex-col gap-4">
            <OperationalShortcutsCard />
            <SystemHealthCard />
          </div>

          <LeadSourceChartCard leadStats={leadStats} />
        </div>
      </div>

      {selectedServiceId && (
        <ProvisioningAuditModal
          serviceId={selectedServiceId}
          onClose={() => setSelectedServiceId(null)}
        />
      )}
    </AppShell>
  );
}
