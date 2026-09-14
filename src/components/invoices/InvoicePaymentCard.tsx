import React from "react";
import { Link } from "@tanstack/react-router";
import { 
  Check, 
  FileCheck, 
  ArrowLeft, 
  Download, 
  FileText, 
  Wallet 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { METHOD_LABELS, type PaymentMethod } from "@/lib/gateways";
import { toast } from "sonner";
import { brl, METHOD_OPTIONS } from "./constants";
import type { InvoicePaymentCardProps } from "./types";

export const InvoicePaymentCard: React.FC<InvoicePaymentCardProps> = ({
  invoice,
  walletBalance,
  paymentMethod,
  paymentResult,
  isWalletPaying,
  isPaymentPending,
  onSelectPaymentMethod,
  onClearPaymentResult,
  onPayWithWallet,
  onPayWithGateway,
  onDownloadReceipt,
}) => {
  const totalAmount = Number(invoice.total_amount || 0);

  return (
    <div className="w-full shrink-0 lg:w-80">
      <div className="sticky top-6 space-y-6">
        {invoice.status !== "paid" ? (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Pagar Fatura</h2>

            {paymentResult ? (
              <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                {paymentResult.method === "pix" ? (
                  <>
                    <div className="mx-auto flex aspect-square w-full max-w-[180px] items-center justify-center rounded-xl bg-white p-2 border border-border">
                      <img src={paymentResult.qrCodeUrl} alt="PIX QR Code" className="w-full" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-center text-xs text-muted-foreground">
                        Escaneie o QR Code ou copie o código Pix Copia e Cola:
                      </p>
                      <div className="rounded-lg bg-secondary/50 p-2 font-mono text-[10px] break-all border border-border">
                        {paymentResult.pixCode}
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full rounded-xl"
                        onClick={() => {
                          if (paymentResult.pixCode) {
                            navigator.clipboard.writeText(paymentResult.pixCode);
                            toast.success("Código PIX copiado!");
                          }
                        }}
                      >
                        Copiar Chave PIX
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-4 py-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
                        <FileText className="h-8 w-8" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-bold">Boleto Gerado</h3>
                        <p className="text-xs text-muted-foreground">Use a linha digitável ou baixe o PDF para pagar.</p>
                      </div>
                    </div>

                    {paymentResult.digitableLine && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-medium uppercase text-muted-foreground">Linha Digitável</p>
                        <div className="rounded-lg bg-secondary/50 p-3 font-mono text-[11px] break-all border border-border">
                          {paymentResult.digitableLine}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full rounded-xl gap-2"
                          onClick={() => {
                            if (paymentResult.digitableLine) {
                              navigator.clipboard.writeText(paymentResult.digitableLine);
                              toast.success("Linha digitável copiada!");
                            }
                          }}
                        >
                          Copiar Linha
                        </Button>
                      </div>
                    )}

                    {paymentResult.checkoutUrl && (
                      <Button 
                        className="w-full rounded-xl gap-2 h-12 text-lg"
                        onClick={() => window.open(paymentResult.checkoutUrl, "_blank")}
                      >
                        <Download className="size-5" />
                        Baixar Boleto (PDF)
                      </Button>
                    )}
                  </div>
                )}

                <Button 
                  variant="ghost" 
                  className="w-full text-xs text-muted-foreground"
                  onClick={onClearPaymentResult}
                >
                  Alterar forma de pagamento
                </Button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Forma de pagamento</p>
                  <div className="space-y-2">
                    {walletBalance > 0 && (
                      <button
                        key="wallet"
                        onClick={() => onSelectPaymentMethod("wallet")}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all",
                          paymentMethod === "wallet"
                            ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                            : "border-border hover:border-emerald-500/50 bg-card",
                        )}
                      >
                        <Wallet className="size-5 shrink-0 text-emerald-600" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">Saldo da Carteira</p>
                            <span className="text-xs font-bold text-emerald-600">{brl.format(walletBalance)}</span>
                          </div>
                          <p className="text-[10px] uppercase text-muted-foreground">
                            {walletBalance >= totalAmount ? "Disponível • Liquidação imediata" : "Saldo insuficiente para o total"}
                          </p>
                        </div>
                      </button>
                    )}

                    {METHOD_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => onSelectPaymentMethod(opt.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all",
                            paymentMethod === opt.id
                              ? "border-brand bg-brand/5 ring-1 ring-brand"
                              : "border-border hover:border-brand/50 bg-card",
                          )}
                        >
                          <Icon className="size-5 shrink-0 text-brand" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{METHOD_LABELS[opt.id as PaymentMethod]}</p>
                            <p className="text-[10px] uppercase text-muted-foreground">{opt.hint}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button 
                  className="w-full rounded-xl h-11"
                  disabled={paymentMethod === "wallet" ? (isWalletPaying || walletBalance < totalAmount) : isPaymentPending}
                  onClick={() => {
                    if (paymentMethod === "wallet") {
                      onPayWithWallet();
                    } else {
                      onPayWithGateway(paymentMethod as PaymentMethod);
                    }
                  }}
                >
                  {paymentMethod === "wallet" 
                    ? (isWalletPaying ? "Debitando Saldo..." : "Pagar com Saldo da Carteira")
                    : (isPaymentPending ? "Processando..." : `Pagar com ${METHOD_LABELS[paymentMethod as PaymentMethod]}`)}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-success/5 p-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/20 text-success">
              <Check className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-success">Fatura Paga</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta fatura foi liquidada em {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString("pt-BR") : "data confirmada"}.
            </p>
            <Button 
              variant="outline" 
              className="mt-6 w-full rounded-xl gap-2" 
              onClick={onDownloadReceipt}
            >
              <FileCheck className="size-4 text-green-600" />
              Baixar Recibo de Quitação
            </Button>
          </div>
        )}
        
        <Link to="/invoices">
          <Button variant="ghost" className="w-full rounded-xl gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Voltar para faturas
          </Button>
        </Link>
      </div>
    </div>
  );
};
