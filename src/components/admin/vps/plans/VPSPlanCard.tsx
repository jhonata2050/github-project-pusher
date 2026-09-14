import { Monitor, Edit2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { brl, CYCLE_LABELS, getPublicOrigin } from "./constants";
import type { VPSPlanCardProps } from "./types";

export function VPSPlanCard({ plan, onEdit }: VPSPlanCardProps) {
  const monthly = plan.product_prices?.find((p) => p.cycle === "monthly" && p.is_active);

  return (
    <article
      key={plan.id}
      className="group relative rounded-2xl border border-border p-5 transition-all hover:shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Monitor className="size-4 text-brand" />
            {plan.name}
          </h2>
          <p className="text-xs text-muted-foreground">{plan.product_groups?.name ?? "Sem grupo"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={plan.is_visible ? "default" : "secondary"}>
            {plan.is_visible ? "Visível" : "Oculto"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onEdit(plan)}
          >
            <Edit2 className="size-4" />
          </Button>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
      <dl className="mt-4 space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <dt>Plano no provedor</dt>
          <dd className="text-foreground">{plan.external_id ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Disco</dt>
          <dd className="text-foreground">
            {plan.disk_quota_mb ? `${Math.round(plan.disk_quota_mb / 1024)} GB` : "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Preços ativos</dt>
          <dd className="text-foreground">
            {plan.product_prices?.filter((p) => p.is_active).length ?? 0}
          </dd>
        </div>
        {plan.immediate_purchase && (
          <div className="mt-1 flex items-center justify-between">
            <dt className="font-medium text-brand">Link de venda</dt>
            <dd>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 h-6 w-6"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${getPublicOrigin()}/checkout/${plan.id}?immediate=true&mode=signup`,
                  );
                  toast.success("Link copiado!");
                }}
              >
                <Copy className="size-3" />
              </Button>
            </dd>
          </div>
        )}
      </dl>
      <p className="mt-4 text-lg font-semibold">
        {monthly ? brl.format(Number(monthly.price)) : "Sem preço mensal"}
        <span className="text-sm font-normal text-muted-foreground">
          {monthly ? ` /${CYCLE_LABELS[monthly.cycle] || monthly.cycle}` : ""}
        </span>
      </p>
    </article>
  );
}
