import { Edit2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { brl, CYCLE_LABELS, type ProductItem } from "./types";

interface ProductCardProps {
  product: ProductItem;
  onEdit: (product: ProductItem) => void;
}

export function ProductCard({ product, onEdit }: ProductCardProps) {
  const monthly = product.product_prices?.find((p) => p.cycle === "monthly" && p.is_active);

  return (
    <article className="group relative rounded-2xl border border-border p-5 transition-all hover:shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{product.name}</h2>
          <p className="text-xs text-muted-foreground">
            {product.product_groups?.name ?? "Sem grupo"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={product.is_visible ? "default" : "secondary"}>
            {product.is_visible ? "Visível" : "Oculto"}
          </Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onEdit(product)}
          >
            <Edit2 className="size-4" />
          </Button>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
      <dl className="mt-4 space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <dt>Pacote DirectAdmin</dt>
          <dd className="text-foreground">{product.directadmin_package ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Disco</dt>
          <dd className="text-foreground">
            {product.disk_quota_mb ? `${Math.round(product.disk_quota_mb / 1024)} GB` : "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Preços ativos</dt>
          <dd className="text-foreground">{product.product_prices?.filter(p => p.is_active).length ?? 0}</dd>
        </div>
        {Boolean(product.immediate_purchase) && (
          <div className="flex justify-between items-center mt-1">
            <dt className="text-brand font-medium">Link de Venda</dt>
            <dd>
              <Button 
                variant="ghost" 
                size="icon" 
                className="size-6 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  const publicOrigin = typeof window !== 'undefined' ? window.location.origin : '';
                  const url = `${publicOrigin}/checkout/${product.id}?immediate=true&mode=signup`;
                  navigator.clipboard.writeText(url);
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
          {monthly ? ` /${CYCLE_LABELS[monthly.cycle]}` : ""}
        </span>
      </p>
    </article>
  );
}
