import { cn } from "@/lib/utils";

export interface StepBillingCycleProps {
  prices?: Array<{
    id?: string;
    cycle: string;
    price: number | string;
    is_active?: boolean | null;
  }> | null;
  billingCycle: string;
  onSelectCycle: (cycle: string) => void;
  monthlyRef?: number;
  brl: Intl.NumberFormat;
}

const CYCLE_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semiannually: 6,
  annually: 12,
  biennially: 24,
  triennially: 36,
  one_time: 1,
};

const CYCLE_NAMES: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannually: "Semestral",
  annually: "Anual",
  biennially: "Bienal",
  triennially: "Trienal",
  one_time: "Pagamento Único",
};

export function StepBillingCycle({
  prices,
  billingCycle,
  onSelectCycle,
  monthlyRef = 0,
  brl,
}: StepBillingCycleProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Escolha o Ciclo de Faturamento</h2>
      <div className="grid grid-cols-2 gap-3">
        {prices?.map((p) => {
          const cyclePrice = Number(p.price);
          const months = CYCLE_MONTHS[p.cycle] || 1;
          const monthlyEquivalent = months > 1 ? cyclePrice / months : cyclePrice;
          let savings = 0;
          if (months > 1 && monthlyRef > 0) {
            savings = Math.round(((monthlyRef * months - cyclePrice) / (monthlyRef * months)) * 100);
          }

          const cycleName = CYCLE_NAMES[p.cycle] || p.cycle;

          return (
            <button
              type="button"
              key={p.cycle}
              onClick={() => onSelectCycle(p.cycle)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all relative overflow-hidden group cursor-pointer",
                billingCycle === p.cycle
                  ? "border-brand bg-brand/5 ring-1 ring-brand"
                  : "border-border hover:border-brand/50"
              )}
            >
              {savings > 0 && (
                <div className="absolute top-0 right-0 bg-brand text-brand-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg uppercase">
                  -{savings}%
                </div>
              )}
              <p className="font-semibold uppercase text-[9px] text-muted-foreground">{cycleName}</p>
              <div className="mt-1">
                <p className="font-bold text-base leading-none">
                  {brl.format(monthlyEquivalent)}
                  <span className="text-[10px] font-normal text-muted-foreground ml-0.5">/mês</span>
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  Total no ciclo: {brl.format(cyclePrice)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
