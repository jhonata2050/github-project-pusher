import React from "react";
import { brl } from "./constants";
import type { InvoiceItemsTableProps } from "./types";

export const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({ invoice }) => {
  const subtotal = Number(invoice.subtotal || invoice.total_amount || 0);
  const discount = Number(invoice.discount_amount || 0);
  const total = Number(invoice.total_amount || 0);

  return (
    <div>
      <div className="mt-8 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-[13px] sm:text-sm">
          <thead className="bg-secondary/30 text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-2 sm:px-4 py-3">Descrição</th>
              <th className="px-2 sm:px-4 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoice.invoice_items && invoice.invoice_items.length > 0 ? (
              invoice.invoice_items.map((item) => (
                <tr key={item.id}>
                  <td className="px-2 sm:px-4 py-4 font-medium">{item.description}</td>
                  <td className="px-2 sm:px-4 py-4 text-right font-semibold">{brl.format(Number(item.amount))}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum item discriminado nesta fatura.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col items-end gap-2 text-sm">
        <div className="flex w-full max-w-[200px] justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{brl.format(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex w-full max-w-[200px] justify-between text-success">
            <span>Desconto</span>
            <span className="font-medium">-{brl.format(discount)}</span>
          </div>
        )}
        <div className="mt-2 flex w-full max-w-[200px] justify-between border-t border-border pt-2 text-lg font-bold">
          <span>Total</span>
          <span className="text-brand">{brl.format(total)}</span>
        </div>
      </div>
    </div>
  );
};
