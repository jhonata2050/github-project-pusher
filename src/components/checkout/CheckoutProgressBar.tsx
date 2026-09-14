import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckoutProgressBarProps {
  steps: string[];
  currentStep: number;
}

export function CheckoutProgressBar({ steps, currentStep }: CheckoutProgressBarProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-6 mb-3 py-1.5 px-3 bg-muted/20 border border-border/40 rounded-xl shrink-0">
      {steps.map((name, i) => {
        const stepNum = i + 1;
        const isCompleted = currentStep > stepNum;
        const isCurrent = currentStep === stepNum;

        return (
          <div key={name} className="flex items-center gap-2">
            <div
              className={cn(
                "size-5.5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors shrink-0",
                isCompleted
                  ? "bg-primary border-primary text-primary-foreground"
                  : isCurrent
                  ? "border-primary text-primary font-black bg-primary/10"
                  : "text-muted-foreground border-border/70"
              )}
            >
              {isCompleted ? <Check className="size-3" /> : stepNum}
            </div>
            <span
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wider hidden sm:inline",
                isCurrent ? "text-foreground font-bold" : "text-muted-foreground"
              )}
            >
              {name}
            </span>
            {i < steps.length - 1 && (
              <div className="w-6 sm:w-12 h-0.5 bg-border/60 mx-1 hidden sm:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}
