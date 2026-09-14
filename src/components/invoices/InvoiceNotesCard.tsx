import React from "react";
import { Info } from "lucide-react";

export interface InvoiceNotesCardProps {
  notes?: string | null | undefined;
}

export const InvoiceNotesCard: React.FC<InvoiceNotesCardProps> = ({ notes }) => {
  return (
    <div className="rounded-2xl border border-border bg-sidebar p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Info className="size-5 text-brand" />
        Observações
      </h2>
      <p className="mt-2 text-sm text-muted-foreground italic">
        {notes || "Após a confirmação do pagamento, seu serviço é liberado ou renovado automaticamente pelo sistema."}
      </p>
    </div>
  );
};
