import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, Receipt, Store, Ticket, ArrowRight, ArrowLeft } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createOrder, getInvoiceDetails } from "@/lib/finance.functions";
import { initializePayment } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";

import { StepDomain } from "@/components/checkout/StepDomain";
import { StepVPSConfig } from "@/components/checkout/StepVPSConfig";
import { StepAuth } from "@/components/checkout/StepAuth";
import { StepPayment } from "@/components/checkout/StepPayment";

import { StepSummary } from "@/components/checkout/StepSummary";

export const Route = createFileRoute("/checkout/$productId")({
  head: () => ({
    meta: [
      { title: "Checkout - Contratar plano - HostPanel" },
      { name: "description", content: "Finalize a contratação do seu plano de hospedagem com pagamento via Pix, cartão ou boleto." },
      { property: "og:title", content: "Checkout - Contratar plano - HostPanel" },
      { property: "og:description", content: "Finalize a contratação do seu plano de hospedagem com pagamento via Pix, cartão ou boleto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function CheckoutPage() {
  const { productId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const executeCreateOrder = useServerFn(createOrder);
  const startPayment = useServerFn(initializePayment);
  
  const [step, setStep] = useState(1);
  const [pixResult, setPixResult] = useState<any>(null);
  const [isProcessingPix, setIsProcessingPix] = useState(false);
  const [billingCycle, setBillingCycle] = useState<string>("");
  const [domain, setDomain] = useState("");
  const [domainType, setDomainType] = useState("register");
  const [vpsConfig, setVpsConfig] = useState({ hostname: "", os: "", location: "" });
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [hasStartedAutoPix, setHasStartedAutoPix] = useState(false);
  const [isDomainValid, setIsDomainValid] = useState(false);
  const [cpfCnpj, setCpfCnpj] = useState("");

  const product = useQuery({
    queryKey: ["checkout-product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_prices(*)")
        .eq("id", productId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const productType = product.data?.product_type?.toLowerCase() || "other";

  const activePrices = useMemo(
    () => (product.data?.product_prices || []).filter((p: any) => p.is_active !== false),
    [product.data],
  );

  // Seleciona automaticamente o primeiro ciclo disponível (evita "Preço não encontrado para este ciclo")
  useEffect(() => {
    if (!billingCycle && activePrices.length > 0) {
      const monthly = activePrices.find((p: any) => p.cycle === "monthly");
      const chosen = monthly ?? activePrices[0];
      if (chosen?.cycle) setBillingCycle(chosen.cycle);
    }
  }, [activePrices, billingCycle]);

  const steps = useMemo(() => {
    const list = [];
    if (productType === "hosting") list.push("Domínio");
    if (productType === "vps") list.push("Configuração");
    list.push("Ciclo de Faturamento");
    if (!user) list.push("Conta");
    list.push("Resumo");
    list.push("Pagamento");
    return list;
  }, [productType, user]);

  const orderMutation = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        throw new Error("SESSION_REQUIRED");
      }
      
      const order = await executeCreateOrder({
        data: {
          productId,
          billingCycle: billingCycle as any,
          domain: domain || undefined,
        }
      });

      if (paymentMethod === "pix") {
        setIsProcessingPix(true);
        try {
          const pixData = await startPayment({ 
            data: { 
              invoiceId: order.invoiceId, 
              method: "pix",
            } 
          });
          setPixResult(pixData);
        } catch (err) {
          console.error("Erro ao gerar Pix:", err);
          toast.error("Erro ao gerar QR Code Pix. Tente novamente ou mude o método.");
        } finally {
          setIsProcessingPix(false);
        }
      } else if (paymentMethod === "credit_card" || paymentMethod === "boleto") {
        setIsProcessingPix(true);
        try {
          console.log(`[Checkout] Iniciando pagamento ${paymentMethod} para fatura ${order.invoiceId}`);
          const paymentData = await startPayment({
            data: {
              invoiceId: order.invoiceId,
              method: paymentMethod,
            }
          });
          
          if (paymentData.checkoutUrl) {
            console.log(`[Checkout] Redirecionando para ${paymentData.checkoutUrl}`);
            window.location.href = paymentData.checkoutUrl;
            // IMPORTANTE: Não resetamos o loading aqui para manter o estado visual até que a página mude
            return order; 
          } else if (paymentData.pixCode) {
            // Caso raro onde o método mudou no meio ou fallback retornou pix
            setPixResult(paymentData);
            setIsProcessingPix(false);
          } else {
            throw new Error("URL de pagamento não gerada pelo gateway.");
          }
        } catch (err: any) {
          console.error(`[Checkout] Erro ao processar ${paymentMethod}:`, err);
          toast.error(`Erro ao processar pagamento: ${err.message || "Tente outro método."}`);
          setIsProcessingPix(false);
          throw err;
        }
      }

      return order;

    },
    onSuccess: (data) => {
      if (paymentMethod !== "pix") {
        toast.success("Pedido realizado com sucesso!");
        navigate({ to: "/invoices" });
      }
    },
    onError: (error: any) => {
      const msg = String(error?.message || "");
      if (msg === "SESSION_REQUIRED" || msg.toLowerCase().includes("unauthorized")) {
        toast.error("Sua sessão expirou. Entre novamente.");
        const accountIdx = steps.indexOf("Conta");
        if (accountIdx >= 0) setStep(accountIdx + 1);
        return;
      }
      toast.error("Erro ao realizar pedido: " + msg);
    }
  });

  useEffect(() => {
    if (!user && !product.isLoading) {
      navigate({ to: "/auth", search: { redirect: `/checkout/${productId}` } as any });
    }
  }, [user, product.isLoading, productId, navigate]);

  if (product.isLoading) return <AppShell area="client" breadcrumb={<span>Checkout</span>}><Skeleton className="h-96 rounded-3xl" /></AppShell>;
  if (!product.data) return <AppShell area="client" breadcrumb={<span>Checkout</span>}>Produto não encontrado</AppShell>;
  if (!user) return null;

  const currentPrice = product.data.product_prices?.find((p) => p.cycle === billingCycle) || product.data.product_prices?.[0];

  const renderStep = () => {
    let currentStepIdx = step - 1;
    let stepName = steps[currentStepIdx];

    switch (stepName) {
      case "Domínio":
        return <StepDomain domain={domain} setDomain={setDomain} domainType={domainType} setDomainType={setDomainType} onValidChange={setIsDomainValid} />;
      case "Configuração":
        return <StepVPSConfig config={vpsConfig} setConfig={setVpsConfig} />;
      case "Ciclo de Faturamento":
        const monthlyRef = Number(product.data.product_prices?.find(pr => pr.cycle === "monthly")?.price || 0);
        return (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Escolha o Ciclo de Faturamento</h2>
            <div className="grid grid-cols-2 gap-3">
              {product.data.product_prices?.map((p) => {
                const cyclePrice = Number(p.price);
                const months = p.cycle === "monthly" ? 1 : p.cycle === "semiannually" ? 6 : p.cycle === "annually" ? 12 : p.cycle === "biennially" ? 24 : 1;
                const monthlyEquivalent = months > 1 ? cyclePrice / months : cyclePrice;
                let savings = 0;
                if (months > 1 && monthlyRef > 0) {
                  savings = Math.round(((monthlyRef * months - cyclePrice) / (monthlyRef * months)) * 100);
                }

                const cycleNames: Record<string, string> = {
                  monthly: "Mensal",
                  semiannually: "Semestral",
                  annually: "Anual",
                  biennially: "Bienal",
                };
                const cycleName = cycleNames[p.cycle] || p.cycle;

                return (
                  <button
                    key={p.cycle}
                    onClick={() => setBillingCycle(p.cycle)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all relative overflow-hidden group",
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
      case "Conta":
        return <StepAuth onComplete={() => setStep(s => s + 1)} />;
      case "Resumo":
        return (
          <StepSummary 
            product={product.data}
            currentPrice={currentPrice}
            domain={domain}
            vpsConfig={vpsConfig}
            brl={brl}
          />
        );
      case "Pagamento":
        return (
          <StepPayment 
            paymentMethod={paymentMethod} 
            setPaymentMethod={setPaymentMethod} 
            onPay={() => {
              setHasStartedAutoPix(true);
              orderMutation.mutate();
            }} 
            cpfCnpj={cpfCnpj}
            setCpfCnpj={setCpfCnpj}
            pixResult={pixResult}
            isProcessingPix={isProcessingPix}
            hasStartedAutoPix={hasStartedAutoPix}
          />
        );
      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    let stepName = steps[step - 1];
    if (stepName === "Domínio" && (!domain || !isDomainValid)) return true;
    if (stepName === "Configuração" && (!vpsConfig.hostname || !vpsConfig.os || !vpsConfig.location)) return true;
    if (stepName === "Conta" && !user) return true;
    if (stepName === "Pagamento" && paymentMethod === "pix" && !cpfCnpj) return true;
    return false;
  };

  return (
    <AppShell
      area="client"
      breadcrumb={
        <>
          <span className="flex items-center gap-2"><Store className="size-4" />Loja</span>
          <span>/</span>
          <span className="flex items-center gap-2 font-medium text-foreground"><Receipt className="size-4" />Checkout</span>
        </>
      }
    >
      <div className="max-w-5xl mx-auto flex flex-col h-full lg:overflow-hidden">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-4 px-4 shrink-0">
          {steps.map((name, i) => (
            <div key={name} className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "size-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors",
                step > i + 1 ? "bg-brand border-brand text-white" : step === i + 1 ? "border-brand text-brand" : "text-muted-foreground"
              )}>
                {step > i + 1 ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span className={cn("text-[9px] font-medium uppercase hidden sm:block", step === i + 1 ? "text-foreground" : "text-muted-foreground")}>
                {name}
              </span>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3 flex-1 min-h-0">
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div className="bg-card border rounded-3xl p-6 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {renderStep()}
              </div>
              
              <div className="mt-6 flex justify-between items-center shrink-0 border-t pt-4">
                {step > 1 && steps[step-1] !== "Pagamento" && (
                  <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="gap-2 h-10 px-4 rounded-xl text-sm">
                    <ArrowLeft className="size-4" /> Voltar
                  </Button>
                )}
                <div className="flex-1" />
                {step < steps.length && steps[step-1] !== "Conta" && (
                  <Button 
                    onClick={() => setStep(s => s + 1)} 
                    disabled={isNextDisabled()}
                    className="gap-2 h-11 px-6 rounded-xl text-sm font-semibold"
                  >
                    Próximo <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <div className="rounded-3xl border bg-sidebar p-5 sticky top-6">
              <h2 className="text-base font-semibold mb-4">Resumo rápido</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">{product.data.name}</span>
                  <span className="font-medium text-xs">{brl.format(Number(currentPrice?.price ?? 0))}</span>
                </div>
                {domain && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground text-[10px]">Domínio</span>
                    <span className="font-mono text-[9px] truncate ml-2">{domain}</span>
                  </div>
                )}
                <div className="border-t border-sidebar-border pt-4 flex justify-between items-end">
                  <span className="font-bold text-sm">Total hoje</span>
                  <span className="text-lg font-black text-brand leading-none">
                    {brl.format(Number(currentPrice?.price ?? 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
