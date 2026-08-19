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
  Store 
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getInvoiceDetails } from "@/lib/finance.functions";
import { GATEWAYS, METHOD_LABELS, type PaymentMethod } from "@/lib/gateways";

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

const METHOD_OPTIONS: { id: PaymentMethod; hint: string; icon: typeof QrCode }[] = [
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
  const fetchInvoice = useServerFn(getInvoiceDetails);
  const startPayment = useServerFn(initializePayment);
  
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | "boleto">("pix");
  const [gateway, setGateway] = useState<string>("abacatepay");
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const invoice = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => fetchInvoice({ data: { id: invoiceId } }),
  });

  const paymentMutation = useMutation({
    mutationFn: async (method: "pix" | "credit_card" | "boleto") => {
      console.log(`[Invoice] Iniciando pagamento ${method} para fatura ${invoiceId}`);
      const data = await startPayment({ data: { invoiceId, method } });
      
      if (data.method === "pix" || data.method === "boleto") {
        setPaymentResult(data);
      } else if (data.checkoutUrl) {
        console.log(`[Invoice] Redirecionando para ${data.checkoutUrl}`);
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

  const inv = invoice.data;
  const status = STATUS_LABELS[inv.status] || { label: inv.status, color: "bg-muted" };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) return;
    
    setIsGeneratingPdf(true);
    const toastId = toast.loading("Gerando recibo em PDF...");
    
    try {
      // Pequeno delay para garantir que o elemento oculto esteja no DOM
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`recibo-${inv.id.slice(0, 8)}.pdf`);
      
      toast.success("Recibo baixado com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF do recibo.", { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
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
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">Fatura #{inv.id.slice(0, 8)}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Emitida em {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <Badge className={cn("rounded-full border-none px-4 py-1 text-xs font-bold uppercase", status.color)}>
                {status.label}
              </Badge>
            </div>

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
                <span className="font-medium">{brl.format(Number(inv.subtotal))}</span>
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
              {inv.notes || "Nenhuma observação disponível para esta fatura."}
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
                            Escaneie o código acima ou copie a chave PIX abaixo:
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
                        {METHOD_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => setPaymentMethod(opt.id)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all",
                                paymentMethod === opt.id
                                  ? "border-brand bg-brand/5 ring-1 ring-brand"
                                  : "border-border hover:border-brand/50",
                              )}
                            >
                              <Icon className="size-5 shrink-0 text-brand" />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold">{METHOD_LABELS[opt.id]}</p>
                                <p className="text-[10px] uppercase text-muted-foreground">{opt.hint}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      className="mt-2 h-12 w-full rounded-xl text-lg font-semibold"
                      onClick={() => paymentMutation.mutate(paymentMethod)}
                      disabled={paymentMutation.isPending}
                    >
                      {paymentMutation.isPending ? "Processando..." : "Pagar agora"}
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
                  Esta fatura foi liquidada em {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("pt-BR") : "data desconhecida"}.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-6 w-full rounded-xl gap-2" 
                  onClick={handleDownloadReceipt}
                  disabled={isGeneratingPdf}
                >
                  <Download className="size-4" />
                  {isGeneratingPdf ? "Gerando..." : "Baixar Recibo (PDF)"}
                </Button>

                {/* Hidden Receipt Template for PDF Generation */}
                <div className="hidden">
                  <div 
                    ref={receiptRef}
                    className="p-10 text-slate-900 bg-white"
                    style={{ width: "800px", fontFamily: "sans-serif" }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h1 className="text-2xl font-bold">Recibo de Pagamento</h1>
                        <p className="text-slate-500 text-sm mt-1">Fatura #{inv.id.slice(0, 8)}</p>
                      </div>
                      <div className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-xs font-bold uppercase">
                        Paga
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mt-8 pb-8 border-b border-slate-200">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Dados da Fatura</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p><span className="text-slate-500">Emitida em:</span> {new Date(inv.created_at).toLocaleDateString("pt-BR")}</p>
                          <p><span className="text-slate-500">Paga em:</span> {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("pt-BR") : "—"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Cliente</p>
                        <div className="mt-2 text-sm">
                          <p className="font-medium">{(inv as any).profiles?.full_name || "Cliente"}</p>
                          <p className="text-slate-500">{(inv as any).profiles?.email || ""}</p>
                        </div>
                      </div>
                    </div>

                    <table className="w-full mt-8 text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                          <th className="py-3 text-left">Descrição</th>
                          <th className="py-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inv.invoice_items?.map((item: any) => (
                          <tr key={item.id}>
                            <td className="py-4 font-medium">{item.description}</td>
                            <td className="py-4 text-right font-bold text-slate-900">{brl.format(Number(item.amount))}</td>
                          </tr>
                        )) || (
                          <tr>
                            <td className="py-4 font-medium">Serviço</td>
                            <td className="py-4 text-right font-bold text-slate-900">{brl.format(Number(inv.total_amount))}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col items-end">
                      <div className="flex w-64 justify-between items-center text-lg font-bold">
                        <span className="text-slate-500">Total Pago:</span>
                        <span className="text-brand">{brl.format(Number(inv.total_amount))}</span>
                      </div>
                      <p className="mt-12 text-center w-full text-xs text-slate-400 italic">
                        Este é um recibo gerado automaticamente pelo sistema Eqsam.
                      </p>
                    </div>
                  </div>
                </div>
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
