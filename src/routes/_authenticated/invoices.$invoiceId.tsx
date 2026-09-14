import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { getInvoiceDetails } from "@/lib/finance.functions";
import type { PaymentMethod } from "@/lib/gateways";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { useBranding } from "@/hooks/use-branding";
import { getMyWallet, payWithWalletBalance } from "@/lib/wallet.functions";
import { initializePayment } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  type PaymentMethodType,
  type PaymentResultData,
  getInvoiceStatusInfo,
  InvoiceHeader,
  InvoiceItemsTable,
  InvoiceNotesCard,
  InvoicePaymentCard,
} from "@/components/invoices";

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId")({
  head: ({ params }) => ({
    meta: [
      { title: `Fatura #${params.invoiceId.slice(0, 8)} — Eqsam` },
    ],
  }),
  component: InvoiceDetailsPage,
});

function InvoiceDetailsPage() {
  const { invoiceId } = Route.useParams();
  const branding = useBranding();
  const fetchInvoice = useServerFn(getInvoiceDetails);
  const startPayment = useServerFn(initializePayment);
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("pix");
  const [paymentResult, setPaymentResult] = useState<PaymentResultData | null>(null);

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
    onSuccess: () => {
      toast.success("Fatura liquidada com sucesso utilizando o saldo da sua carteira!");
      window.location.reload();
    },
    onError: (err: any) => {
      toast.error(`Falha no pagamento com saldo: ${err.message}`);
    }
  });

  const paymentMutation = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      const data = await startPayment({ data: { invoiceId, method } });
      
      if (data.method === "pix" || data.method === "boleto") {
        setPaymentResult(data as PaymentResultData);
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

  if (invoice.isLoading) {
    return (
      <AppShell breadcrumb={<span>Carregando fatura...</span>}>
        <Skeleton className="h-96 rounded-3xl" />
      </AppShell>
    );
  }

  if (!invoice.data) {
    return (
      <AppShell breadcrumb={<span>Fatura não encontrada</span>}>
        Fatura não encontrada
      </AppShell>
    );
  }

  const inv = invoice.data as any;
  const isOverdue = inv.status === "pending" && inv.due_date && new Date(inv.due_date) < new Date();
  const statusInfo = getInvoiceStatusInfo(inv.status, isOverdue);

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
            <InvoiceHeader
              invoice={inv}
              isOverdue={isOverdue}
              statusInfo={statusInfo}
              onDownloadPDF={handleDownloadPDF}
            />

            <InvoiceItemsTable invoice={inv} />
          </div>

          <InvoiceNotesCard notes={inv.notes} />
        </div>

        <InvoicePaymentCard
          invoice={inv}
          walletBalance={walletBalance}
          paymentMethod={paymentMethod}
          paymentResult={paymentResult}
          isWalletPaying={walletPayMutation.isPending}
          isPaymentPending={paymentMutation.isPending}
          onSelectPaymentMethod={setPaymentMethod}
          onClearPaymentResult={() => setPaymentResult(null)}
          onPayWithWallet={() => walletPayMutation.mutate()}
          onPayWithGateway={(method) => paymentMutation.mutate(method)}
          onDownloadReceipt={() => handleDownloadPDF(true)}
        />
      </div>
    </AppShell>
  );
}
