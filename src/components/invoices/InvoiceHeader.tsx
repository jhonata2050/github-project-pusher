import React from "react";
import { Download, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvoiceHeaderProps } from "./types";

export const InvoiceHeader: React.FC<InvoiceHeaderProps> = ({
  invoice,
  isOverdue,
  statusInfo,
  onDownloadPDF,
}) => {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fatura #{invoice.id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Emitida em {new Date(invoice.created_at).toLocaleDateString("pt-BR")}
            {invoice.due_date && ` • Vencimento: ${new Date(invoice.due_date).toLocaleDateString("pt-BR")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("rounded-full border-none px-4 py-1 text-xs font-bold uppercase", statusInfo.color)}>
            {statusInfo.label}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onDownloadPDF(invoice.status === "paid")}
            className="rounded-xl flex gap-1.5 text-xs"
          >
            <Download className="size-3.5" />
            {invoice.status === "paid" ? "Baixar Recibo (PDF)" : "Baixar Fatura (PDF)"}
          </Button>
        </div>
      </div>

      {isOverdue && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0 text-red-600" />
          <span>
            Esta fatura está vencida desde <strong>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("pt-BR") : "data informada"}</strong>. Efetue o pagamento para evitar a suspensão dos serviços.
          </span>
        </div>
      )}
    </div>
  );
};
