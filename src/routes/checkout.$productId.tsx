import { createFileRoute } from "@tanstack/react-router";
import { Store, Receipt, ArrowLeft, ArrowRight, CheckCircle2, QrCode, CreditCard } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { StepDomain } from "@/components/checkout/StepDomain";
import { StepVPSConfig } from "@/components/checkout/StepVPSConfig";
import { StepAuth } from "@/components/checkout/StepAuth";
import { StepPayment } from "@/components/checkout/StepPayment";
import { StepSummary } from "@/components/checkout/StepSummary";
import { StepBillingCycle } from "@/components/checkout/StepBillingCycle";
import { CheckoutProgressBar } from "@/components/checkout/CheckoutProgressBar";
import { CheckoutSummarySidebar } from "@/components/checkout/CheckoutSummarySidebar";
import { useCheckoutProduct } from "@/components/checkout/hooks/useCheckoutProduct";
import { brl } from "@/components/checkout/types";

export const Route = createFileRoute("/checkout/$productId")({
  head: () => ({
    meta: [
      { title: "Checkout - Contratar plano - Eqsam" },
      { name: "description", content: "Finalize a contratação do seu plano de hospedagem com pagamento via Pix, cartão ou boleto." },
      { property: "og:title", content: "Checkout - Contratar plano - Eqsam" },
      { property: "og:description", content: "Finalize a contratação do seu plano de hospedagem com pagamento via Pix, cartão ou boleto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { productId } = Route.useParams();
  const {
    user,
    profile,
    product,
    productType,
    currentPrice,
    pricingDetails,
    walletBalance,
    step,
    setStep,
    steps,
    billingCycle,
    setBillingCycle,
    domain,
    setDomain,
    domainType,
    setDomainType,
    isDomainValid,
    setIsDomainValid,
    vpsConfig,
    setVpsConfig,
    paymentMethod,
    handleSelectPaymentMethod,
    cpfCnpj,
    setCpfCnpj,
    pixResult,
    isProcessingPix,
    hasStartedAutoPix,
    handlePay,
    isNextDisabled,
  } = useCheckoutProduct({ productId });

  if (product.isLoading) {
    return (
      <AppShell area="client" breadcrumb={<span>Checkout</span>}>
        <Skeleton className="h-96 rounded-3xl" />
      </AppShell>
    );
  }

  if (!product.data) {
    return (
      <AppShell area="client" breadcrumb={<span>Checkout</span>}>
        Produto não encontrado
      </AppShell>
    );
  }

  if (!user) return null;

  const renderStep = () => {
    const currentStepIdx = step - 1;
    const stepName = steps[currentStepIdx];

    switch (stepName) {
      case "Domínio":
        return (
          <StepDomain
            domain={domain}
            setDomain={setDomain}
            domainType={domainType}
            setDomainType={setDomainType}
            onValidChange={setIsDomainValid}
          />
        );
      case "Configuração":
        return <StepVPSConfig config={vpsConfig} setConfig={setVpsConfig} />;
      case "Ciclo de Faturamento": {
        const monthlyRef = Number(
          product.data.product_prices?.find((pr: any) => pr.cycle === "monthly")?.price || 0
        );
        return (
          <StepBillingCycle
            prices={product.data.product_prices}
            billingCycle={billingCycle}
            onSelectCycle={setBillingCycle}
            monthlyRef={monthlyRef}
            brl={brl}
          />
        );
      }
      case "Conta":
        return <StepAuth onComplete={() => setStep((s) => s + 1)} />;
      case "Resumo":
        return (
          <StepSummary
            product={product.data}
            currentPrice={currentPrice}
            domain={domain}
            vpsConfig={vpsConfig}
            brl={brl}
            pricingDetails={pricingDetails}
          />
        );
      case "Pagamento":
        return (
          <StepPayment
            paymentMethod={paymentMethod}
            setPaymentMethod={handleSelectPaymentMethod}
            onPay={handlePay}
            cpfCnpj={cpfCnpj}
            setCpfCnpj={setCpfCnpj}
            pixResult={pixResult}
            isProcessingPix={isProcessingPix}
            hasStartedAutoPix={hasStartedAutoPix}
            walletBalance={walletBalance}
            totalAmount={Number(currentPrice?.price ?? 0)}
            profile={profile}
          />
        );
      default:
        return null;
    }
  };

  const isCurrentNextDisabled = isNextDisabled();
  const isPaymentStep = steps[step - 1] === "Pagamento";

  return (
    <AppShell
      area="client"
      containerClassName="py-2 lg:py-3 px-3 lg:px-6"
      cardClassName="p-3.5 sm:p-5 rounded-2xl shadow-xs"
      breadcrumb={
        <>
          <span className="flex items-center gap-1.5"><Store className="size-3.5" />Loja</span>
          <span>/</span>
          <span className="flex items-center gap-1.5 font-medium text-foreground"><Receipt className="size-3.5" />Checkout</span>
        </>
      }
    >
      <div className="w-full max-w-[1360px] mx-auto flex flex-col h-full lg:overflow-hidden">
        <CheckoutProgressBar steps={steps} currentStep={step} />

        <div className="grid gap-4 lg:grid-cols-12 flex-1 min-h-0">
          {/* Coluna Esquerda: Conteúdo do Passo */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col min-h-0">
            <div className="bg-card border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar">
                {renderStep()}
              </div>

              <div className="mt-3 flex justify-between items-center shrink-0 border-t border-border/50 pt-3">
                {step > 1 && (
                  <Button
                    variant="ghost"
                    onClick={() => setStep((s) => s - 1)}
                    className="gap-1.5 h-9 px-3 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <ArrowLeft className="size-3.5" /> Voltar
                  </Button>
                )}
                <div className="flex-1" />
                {step < steps.length && steps[step - 1] !== "Conta" && (
                  <Button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={isCurrentNextDisabled}
                    className="gap-1.5 h-9 px-5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Próximo <ArrowRight className="size-3.5" />
                  </Button>
                )}
                {step === steps.length && !pixResult && (
                  <Button
                    onClick={handlePay}
                    disabled={isCurrentNextDisabled || isProcessingPix}
                    className={cn(
                      "gap-2 h-9 px-5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all",
                      paymentMethod === "wallet" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                    )}
                  >
                    {isProcessingPix ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin size-3.5 border-2 border-background border-t-transparent rounded-full" />
                        Processando...
                      </span>
                    ) : paymentMethod === "wallet" ? (
                      <>
                        <CheckCircle2 className="size-3.5" /> Confirmar e Pagar com Saldo
                      </>
                    ) : paymentMethod === "pix" ? (
                      <>
                        <QrCode className="size-3.5" /> Gerar PIX e Pagar ({brl.format(Number(currentPrice?.price ?? 0))})
                      </>
                    ) : (
                      <>
                        <CreditCard className="size-3.5" /> Pagar Agora ({brl.format(Number(currentPrice?.price ?? 0))})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Resumo do Pedido */}
          <div className="lg:col-span-5 xl:col-span-5 flex flex-col min-h-0">
            <CheckoutSummarySidebar
              product={product.data}
              productType={productType}
              billingCycle={billingCycle}
              currentPrice={currentPrice}
              pricingDetails={pricingDetails}
              domain={domain}
              vpsConfig={vpsConfig}
              paymentMethod={paymentMethod}
              isPaymentStep={isPaymentStep}
              walletBalance={walletBalance}
              isNextDisabled={isCurrentNextDisabled}
              isProcessingPix={isProcessingPix}
              pixResult={pixResult}
              onPay={handlePay}
              brl={brl}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
