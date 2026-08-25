import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Check, 
  CreditCard, 
  Download, 
  FileText, 
  Info, 
  QrCode, 
  Receipt, 
  Store,
  AlertTriangle,
  FileCheck,
  Wallet
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getInvoiceDetails } from "@/lib/finance.functions";
import { GATEWAYS, METHOD_LABELS, type PaymentMethod } from "@/lib/gateways";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { useBranding } from "@/hooks/use-branding";
import { getMyWallet, payWithWalletBalance } from "@/lib/wallet.functions";

import { initializePayment } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId")({
  head: ({ params }) => ({
    meta: [
      { title: `Fatura #${params.invoiceId.slice(0, 8)} — Eqsam` },
    ],
  }),
  component: InvoiceDetailsPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const METHOD_OPTIONS: { id: "pix" | "credit_card" | "boleto" | "wallet"; hint: string; icon: typeof QrCode }[] = [
  { id: "pix", hint: "Aprovação imediata", icon: QrCode },
  { id: "credit_card", hint: "Renovação automática", icon: CreditCard },
  { id: "boleto", hint: "Vence em 3 dias", icon: FileText },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-warning text-warning-foreground" },
  paid: { label: "Paga", color: "bg-success text-success-foreground" },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground" },
  refunded: { label: "Estornada", color: "bg-destructive text-destructive-foreground" },
  overdue: { label: "Atrasada", color: "bg-destructive text-destructive-foreground" },
};

function InvoiceDetailsPage() {
  const { invoiceId } = Route.useParams();
  const branding = useBranding();
  const fetchInvoice = useServerFn(getInvoiceDetails);
  const startPayment = useServerFn(initializePayment);
  
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | "boleto" | "wallet">("pix");
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const invoice = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => fetchInvoice({ data: { id: invoiceId } }),
  });

  const { data: walletData } = useQuery({
    queryKey: ["client-my-wallet"],
    queryFn: () => getMyWallet(),
  });

  const walletBalance = Number(walletData?.balance || 0);

  const walletPayMutation = useMutation({
    mutationFn: () => payWithWalletBalance({ data: { invoiceId } }),
    onSuccess: (res) => {
      toast.success("Fatura liquidada com sucesso utilizando o saldo da sua carteira!");
      window.location.reload();
    },
    onError: (err: any) => {
      toast.error(`Falha no pagamento com saldo: ${err.message}`);
    }
  });

  const paymentMutation = useMutation({
    mutationFn: async (method: "pix" | "credit_card" | "boleto") => {
      const data = await startPayment({ data: { invoiceId, method } });
      
      if (data.method === "pix" || data.method === "boleto") {
        setPaymentResult(data);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Não foi possível gerar o link de pagamento. Tente novamente.");
      }
      return data;
    },
    onSuccess: () => {
      if (paymentMethod === "credit_card") {
        toast.success("Redirecionando para o pagamento...");
      }
    },
    onError: (error: any) => {
      toast.error("Erro ao processar pagamento: " + (error.message || "Tente outro método."));
    }
  });

  if (invoice.isLoading) return <AppShell breadcrumb={<span>Carregando fatura...</span>}><Skeleton className="h-96 rounded-3xl" /></AppShell>;
  if (!invoice.data) return <AppShell breadcrumb={<span>Fatura não encontrada</span>}>Fatura não encontrada</AppShell>;

  const inv = invoice.data as any;
  const isOverdue = inv.status === "pending" && inv.due_date && new Date(inv.due_date) < new Date();
  const statusKey = isOverdue ? "overdue" : inv.status;
  const status = STATUS_LABELS[statusKey] || { label: inv.status, color: "bg-muted" };

  const handleDownloadPDF = async (isReceipt = false) => {
    try {
      await generateInvoicePDF({
        invoice: {
          id: inv.id,
          total_amount: Number(inv.total_amount || 0),
          status: inv.status,
          due_date: inv.due_date,
          paid_at: inv.paid_at,
          payment_method: inv.payment_method,
          created_at: inv.created_at,
          items: inv.invoice_items?.map((it: any) => ({
            id: it.id,
            description: it.description,
            amount: Number(it.amount),
          })),
        },
        client: inv.profiles || null,
        branding: {
          app_name: branding.app_name,
          company_name: branding.app_name,
          support_email: "suporte@eqsam.com",
          website: window.location.origin,
          logo_url: branding.logo_url || null,
          primary_color: branding.primary_color,
          brand_color: branding.brand_color,
        },
        financialSummary: {
          originalAmount: Number(inv.subtotal || inv.total_amount),
          discount: Number(inv.discount_amount || 0),
          finalAmount: Number(inv.total_amount),
        }
      }, isReceipt);
      toast.success(isReceipt ? "Recibo baixado com sucesso!" : "Fatura baixada em PDF!");
    } catch (e: any) {
      toast.error("Erro ao gerar documento PDF: " + e.message);
    }
  };

  return (
    <AppShell
      area="client"
      breadcrumb={
        <>
          <Link to="/invoices" className="flex items-center gap-2 hover:text-foreground">
            <Receipt className="size-4" />
            Minhas faturas
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">#{inv.id.slice(0, 8)}</span>
        </>
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Fatura #{inv.id.slice(0, 8)}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Emitida em {new Date(inv.created_at).toLocaleDateString("pt-BR")} • Vencimento: {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn("rounded-full border-none px-4 py-1 text-xs font-bold uppercase", status.color)}>
                  {status.label}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownloadPDF(inv.status === "paid")}
                  className="rounded-xl flex gap-1.5 text-xs"
                >
                  <Download className="size-3.5" />
                  {inv.status === "paid" ? "Baixar Recibo (PDF)" : "Baixar Fatura (PDF)"}
                </Button>
              </div>
            </div>

            {isOverdue && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-3">
                <AlertTriangle className="size-5 shrink-0 text-red-600" />
                <span>
                  Esta fatura está vencida desde <strong>{new Date(inv.due_date).toLocaleDateString("pt-BR")}</strong>. Efetue o pagamento para evitar a suspensão dos serviços.
                </span>
              </div>
            )}

            <div className="mt-8 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-[13px] sm:text-sm">
                <thead className="bg-secondary/30 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 sm:px-4 py-3">Descrição</th>
                    <th className="px-2 sm:px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {inv.invoice_items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-2 sm:px-4 py-4 font-medium">{item.description}</td>
                      <td className="px-2 sm:px-4 py-4 text-right font-semibold">{brl.format(Number(item.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col items-end gap-2 text-sm">
              <div className="flex w-full max-w-[200px] justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{brl.format(Number(inv.subtotal || inv.total_amount))}</span>
              </div>
              {Number(inv.discount_amount) > 0 && (
                <div className="flex w-full max-w-[200px] justify-between text-success">
                  <span>Desconto</span>
                  <span className="font-medium">-{brl.format(Number(inv.discount_amount))}</span>
                </div>
              )}
              <div className="mt-2 flex w-full max-w-[200px] justify-between border-t border-border pt-2 text-lg font-bold">
                <span>Total</span>
                <span className="text-brand">{brl.format(Number(inv.total_amount))}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-sidebar p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Info className="size-5 text-brand" />
              Observações
            </h2>
            <p className="mt-2 text-sm text-muted-foreground italic">
              {inv.notes || "Após a confirmação do pagamento, seu serviço é liberado ou renovado automaticamente pelo sistema."}
            </p>
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-80">
          <div className="sticky top-6 space-y-6">
            {inv.status !== 'paid' ? (
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
                              navigator.clipboard.writeText(paymentResult.pixCode);
                              toast.success("Código PIX copiado!");
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
                                navigator.clipboard.writeText(paymentResult.digitableLine);
                                toast.success("Linha digitável copiada!");
                              }}
                            >
                              Copiar Linha
                            </Button>
                          </div>
                        )}

                        {paymentResult.checkoutUrl && (
                          <Button 
                            className="w-full rounded-xl gap-2 h-12 text-lg"
                            onClick={() => window.open(paymentResult.checkoutUrl, '_blank')}
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
                      onClick={() => setPaymentResult(null)}
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
                            onClick={() => setPaymentMethod("wallet")}
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
                                {walletBalance >= Number(inv.total_amount) ? "Disponível • Liquidação imediata" : "Saldo insuficiente para o total"}
                              </p>
                            </div>
                          </button>
                        )}

                        {METHOD_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => setPaymentMethod(opt.id as any)}
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
                      disabled={paymentMethod === "wallet" ? (walletPayMutation.isPending || walletBalance < Number(inv.total_amount)) : paymentMutation.isPending}
                      onClick={() => {
                        if (paymentMethod === "wallet") {
                          walletPayMutation.mutate();
                        } else {
                          paymentMutation.mutate(paymentMethod as PaymentMethod);
                        }
                      }}
                    >
                      {paymentMethod === "wallet" 
                        ? (walletPayMutation.isPending ? "Debitando Saldo..." : "Pagar com Saldo da Carteira")
                        : (paymentMutation.isPending ? "Processando..." : `Pagar com ${METHOD_LABELS[paymentMethod as PaymentMethod]}`)}
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
                  Esta fatura foi liquidada em {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("pt-BR") : "data confirmada"}.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-6 w-full rounded-xl gap-2" 
                  onClick={() => handleDownloadPDF(true)}
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
      </div>
    </AppShell>
  );
}
