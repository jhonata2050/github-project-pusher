import { Skeleton } from "@/components/ui/skeleton";
import { VPSPlanCard } from "./VPSPlanCard";
import type { VPSPlansListProps } from "./types";

export function VPSPlansList({ plans, isLoading, onEdit }: VPSPlansListProps) {
  if (isLoading) {
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-border p-16 text-center text-sm text-muted-foreground">
        Nenhum plano VPS cadastrado ainda.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {plans.map((plan) => (
        <VPSPlanCard key={plan.id} plan={plan} onEdit={onEdit} />
      ))}
    </div>
  );
}
