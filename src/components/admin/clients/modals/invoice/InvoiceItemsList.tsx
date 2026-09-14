import { Label } from "@/components/ui/label";

interface InvoiceItemsListProps {
  items: Array<{
    id: string;
    description: string;
    quantity?: number;
    amount: number;
  }>;
}

export function InvoiceItemsList({ items }: InvoiceItemsListProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2 p-3 rounded-2xl bg-muted/20 border">
      <Label className="text-xs font-semibold text-muted-foreground uppercase">Itens da Fatura</Label>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-none">
            <span className="font-medium text-foreground">{item.description} (x{item.quantity || 1})</span>
            <span className="font-mono font-bold">R$ {Number(item.amount).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
