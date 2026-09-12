import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Receipt, Store, Ticket, ArrowRight, ArrowLeft, Wallet, CheckCircle2, QrCode, CreditCard, Info, Clock, Sparkles, Globe, Server, ShieldCheck } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { createOrder, getInvoiceDetails } from "@/lib/finance.functions";
import { initializePayment } from "@/lib/payments.functions";
import { getMyWallet, payWithWalletBalance } from "@/lib/wallet.functions";
import { useServerFn } from "@tanstack/react-start";

import { StepDomain } from "@/components/checkout/StepDomain";
import { StepVPSConfig } from "@/components/checkout/StepVPSConfig";
import { StepAuth } from "@/components/checkout/StepAuth";
import { StepPayment } from "@/components/checkout/StepPayment";

import { StepSummary } from "@/components/checkout/StepSummary";

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

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function getCycleDetails(cycle?: string) {
  switch (cycle) {
    case "monthly":
      return { name: "Mensal", period: "Cobrado a cada mês", badge: "Mensal" };
    case "quarterly":
      return { name: "Trimestral", period: "Cobrado a cada 3 meses", badge: "Trimestral" };
    case "semiannually":
      return { name: "Semestral", period: "Cobrado a cada 6 meses", badge: "Semestral" };
    case "annually":
      return { name: "Anual", period: "Cobrado anualmente (-15% desc.)", badge: "Anual" };
    case "biennially":
      return { name: "Bienal", period: "Cobrado a cada 2 anos", badge: "Bienal" };
    case "triennially":
      return { name: "Trienal", period: "Cobrado a cada 3 anos", badge: "Trienal" };
    case "one_time":
      return { name: "Pagamento Único", period: "Taxa única de ativação", badge: "Único" };
    default:
      return { name: cycle || "Mensal", period: "Cobrado periodicamente", badge: cycle || "Mensal" };
  }
}

function CheckoutPage() {
  const { productId } = Route.useParams();
  const { user, impersonatedClientId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const executeCreateOrder = useServerFn(createOrder);
  const startPayment = useServerFn(initializePayment);
  const executePayWithBalance = useServerFn(payWithWalletBalance);
  
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

  const { data: profile } = useProfile();

  const walletQuery = useQuery({
    queryKey: ["client-my-wallet"],
    queryFn: () => getMyWallet(),
    enabled: !!user,
  });

  const walletBalance = Number(
    profile?.account_balance !== undefined && profile?.account_balance !== null
      ? profile.account_balance
      : (walletQuery.data?.balance ?? 0)
  );

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

  const currentPrice = useMemo(() => {
    return product.data?.product_prices?.find((p: any) => p.cycle === billingCycle) || product.data?.product_prices?.[0];
  }, [product.data, billingCycle]);

  const pricingDetails = useMemo(() => {
    const cycle = billingCycle || currentPrice?.cycle || "monthly";
    const actualPrice = Number(currentPrice?.price ?? 0);
    const monthlyPrice = Number(
      product.data?.product_prices?.find((pr: any) => pr.cycle === "monthly")?.price || 0
    );

    const monthsMap: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      semiannually: 6,
      annually: 12,
      biennially: 24,
      triennially: 36,
    };
    const months = monthsMap[cycle] || 1;

    // Desconto calculado por ciclo comparado ao mensal, ou preço promocional cadastrado
    let originalPrice = 0;
    if (months > 1 && monthlyPrice > 0) {
      originalPrice = monthlyPrice * months;
    } else if (Number((currentPrice as any)?.original_price || (currentPrice as any)?.compare_at_price || 0) > actualPrice) {
      originalPrice = Number((currentPrice as any)?.original_price || (currentPrice as any)?.compare_at_price);
    } else if (Number((product.data as any)?.compare_at_price || (product.data as any)?.original_price || 0) > actualPrice) {
      originalPrice = Number((product.data as any)?.compare_at_price || (product.data as any)?.original_price);
    }

    const hasDiscount = originalPrice > actualPrice && actualPrice > 0;
    const savingsAmount = hasDiscount ? originalPrice - actualPrice : 0;
    const savingsPercent = hasDiscount && originalPrice > 0 ? Math.round((savingsAmount / originalPrice) * 100) : 0;

    return {
      cycle,
      actualPrice,
      originalPrice,
      hasDiscount,
      savingsAmount,
      savingsPercent,
    };
  }, [product.data, billingCycle, currentPrice]);

  const hasAutoSelectedWallet = useRef(false);
  const userSelectedMethod = useRef(false);

  const handleSelectPaymentMethod = (method: string) => {
    userSelectedMethod.current = true;
    setPaymentMethod(method);
  };

  // Se o cliente tiver saldo suficiente em conta, pré-seleciona a carteira apenas uma vez na inicialização se o usuário não tiver escolhido outro método
  useEffect(() => {
    if (userSelectedMethod.current || hasAutoSelectedWallet.current) return;
    const priceVal = Number(currentPrice?.price ?? 0);
    if (walletBalance >= priceVal && priceVal > 0 && !hasStartedAutoPix && !pixResult) {
      hasAutoSelectedWallet.current = true;
      setPaymentMethod("wallet");
    }
  }, [walletBalance, currentPrice, hasStartedAutoPix, pixResult]);
  
  useEffect(() => {
    if (profile?.tax_id && !cpfCnpj) {
      setCpfCnpj(profile.tax_id);
    }
  }, [profile, cpfCnpj]);

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

  // Lógica de Venda Imediata: Pula passos se o parâmetro 'immediate' estiver presente
  useEffect(() => {
    if (product.data?.immediate_purchase) {
      const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      if (searchParams.get("immediate") === "true") {
        if (productType !== "hosting" && productType !== "vps" && step === 1) {
          const cycleIdx = steps.indexOf("Ciclo de Faturamento");
          if (cycleIdx >= 0) setStep(cycleIdx + 1);
        }
      }
    }
  }, [product.data, productType, steps, step]);

  const orderMutation = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        throw new Error("SESSION_REQUIRED");
      }
      
      const affCode = typeof window !== "undefined" ? localStorage.getItem("eqsam_aff_code") || undefined : undefined;

      const order = await executeCreateOrder({
        data: {
          productId,
          billingCycle: billingCycle as any,
          domain: domain || undefined,
          vpsConfig: productType === "vps" ? vpsConfig : undefined,
          affCode: affCode || undefined,
          clientId: impersonatedClientId || undefined,
        }
      });

      // Se o usuário não possuía documento no perfil e digitou para o PIX, salva para compras futuras
      if (profile?.id && !profile?.tax_id && cpfCnpj) {
        try {
          await supabase.from("profiles").update({ tax_id: cpfCnpj.trim() }).eq("id", profile.id);
        } catch (e) {
          console.warn("[Checkout] Falha ao atualizar tax_id no perfil:", e);
        }
      }

      // 1. Pagamento com Saldo da Carteira (Instantâneo)
      if (paymentMethod === "wallet") {
        setIsProcessingPix(true);
        try {
          await executePayWithBalance({
            data: {
              invoiceId: order.invoiceId,
            },
          });
          queryClient.invalidateQueries();
          return order;
        } catch (err: any) {
          console.error("[Checkout] Erro ao pagar com saldo:", err);
          throw new Error(err.message || "Erro ao liquidar com saldo da conta.");
        } finally {
          setIsProcessingPix(false);
        }
      }

      // 2. Pagamento com Pix
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
            return order; 
          } else if (paymentData.pixCode) {
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
    onSuccess: (order) => {
      if (paymentMethod === "wallet") {
        toast.success("Plano contratado e ativado com sucesso usando seu saldo em conta!");
        setTimeout(() => {
          if (productType === "apps" || product.data?.name?.includes("PaaS") || product.data?.name?.includes("MB") || product.data?.name?.includes("GB")) {
            navigate({ to: "/apps" });
          } else if (productType === "vps") {
            navigate({ to: "/vps" });
          } else {
            navigate({ to: "/services" });
          }
        }, 1200);
        return;
      }

      if (paymentMethod !== "pix") {
        toast.success("Pedido realizado com sucesso!");
        setTimeout(() => {
          if (window.location.pathname.includes("/checkout/")) {
            navigate({ to: "/invoices" });
          }
        }, 1000);
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
      const searchParams = new URLSearchParams(window.location.search);
      const isImmediate = searchParams.get("immediate") === "true";
      navigate({ 
        to: "/auth", 
        search: { 
          redirect: `/checkout/${productId}${isImmediate ? '?immediate=true' : ''}` 
        } as any 
      });
    }
  }, [user, product.isLoading, productId, navigate]);

  if (product.isLoading) return <AppShell area="client" breadcrumb={<span>Checkout</span>}><Skeleton className="h-96 rounded-3xl" /></AppShell>;
  if (!product.data) return <AppShell area="client" breadcrumb={<span>Checkout</span>}>Produto não encontrado</AppShell>;
  if (!user) return null;

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
            pricingDetails={pricingDetails}
          />
        );
      case "Pagamento":
        return (
          <StepPayment 
            paymentMethod={paymentMethod} 
            setPaymentMethod={handleSelectPaymentMethod} 
            onPay={() => {
              setHasStartedAutoPix(true);
              orderMutation.mutate();
            }} 
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

  const isNextDisabled = () => {
    let stepName = steps[step - 1];
    if (stepName === "Domínio" && (!domain || !isDomainValid)) return true;
    if (stepName === "Configuração" && (!vpsConfig.hostname || !vpsConfig.os || !vpsConfig.location)) return true;
    if (stepName === "Conta" && !user) return true;
    if (stepName === "Pagamento") {
      const hasTaxId = Boolean((cpfCnpj && cpfCnpj.trim().length > 0) || (profile?.tax_id && profile.tax_id.trim().length > 0));
      if (paymentMethod === "pix" && !hasTaxId) return true;
      if (paymentMethod === "wallet" && walletBalance < Number(currentPrice?.price ?? 0)) return true;
    }
    return false;
  };

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
        {/* Progress Bar Compact */}
        <div className="flex items-center justify-center gap-2 sm:gap-6 mb-3 py-1.5 px-3 bg-muted/20 border border-border/40 rounded-xl shrink-0">
          {steps.map((name, i) => (
            <div key={name} className="flex items-center gap-2">
              <div className={cn(
                "size-5.5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors shrink-0",
                step > i + 1 ? "bg-primary border-primary text-primary-foreground" : step === i + 1 ? "border-primary text-primary font-black bg-primary/10" : "text-muted-foreground border-border/70"
              )}>
                {step > i + 1 ? <Check className="size-3" /> : i + 1}
              </div>
              <span className={cn("text-[11px] font-semibold uppercase tracking-wider hidden sm:inline", step === i + 1 ? "text-foreground font-bold" : "text-muted-foreground")}>
                {name}
              </span>
              {i < steps.length - 1 && (
                <div className="w-6 sm:w-12 h-0.5 bg-border/60 mx-1 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-12 flex-1 min-h-0">
          {/* Coluna Esquerda: Conteúdo do Passo */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col min-h-0">
            <div className="bg-card border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar">
                {renderStep()}
              </div>
              
              <div className="mt-3 flex justify-between items-center shrink-0 border-t border-border/50 pt-3">
                {step > 1 && (
                  <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="gap-1.5 h-9 px-3 rounded-xl text-xs font-medium cursor-pointer">
                    <ArrowLeft className="size-3.5" /> Voltar
                  </Button>
                )}
                <div className="flex-1" />
                {step < steps.length && steps[step-1] !== "Conta" && (
                  <Button 
                    onClick={() => setStep(s => s + 1)} 
                    disabled={isNextDisabled()}
                    className="gap-1.5 h-9 px-5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Próximo <ArrowRight className="size-3.5" />
                  </Button>
                )}
                {step === steps.length && !pixResult && (
                  <Button
                    onClick={() => {
                      setHasStartedAutoPix(true);
                      orderMutation.mutate();
                    }}
                    disabled={isNextDisabled() || isProcessingPix}
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

          {/* Coluna Direita: Resumo do Pedido Compacto e Rápido */}
          <div className="lg:col-span-5 xl:col-span-5 flex flex-col min-h-0">
            <div className="rounded-2xl border bg-sidebar/70 p-4 sticky top-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-sidebar-border pb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="size-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Resumo do Pedido</h2>
                </div>
                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20 py-0.5 px-2">
                  {productType === "apps" || product.data?.name?.includes("PaaS") || product.data?.name?.includes("MB") || product.data?.name?.includes("GB") || product.data?.name?.includes("Bot")
                    ? "Containers (PaaS)"
                    : productType === "vps"
                    ? "Cloud VPS"
                    : "DirectAdmin"}
                </Badge>
              </div>

              {/* Item Selecionado e Ciclo Compacto */}
              {(() => {
                const cycleInfo = getCycleDetails(billingCycle || currentPrice?.cycle);
                return (
                  <div className="p-2.5 rounded-xl bg-card border border-border/70 space-y-1 shadow-2xs">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                            {product.data?.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary bg-primary/5 py-0 px-1.5 h-4.5">
                            {cycleInfo.badge}
                          </Badge>
                          {pricingDetails.hasDiscount && (
                            <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400 bg-lime-500/10 border border-lime-500/20 px-1.5 py-0.5 rounded-md">
                              -{pricingDetails.savingsPercent}% OFF
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="size-3 text-primary shrink-0" />
                          <span className="truncate">{cycleInfo.period}</span>
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        {pricingDetails.hasDiscount && (
                          <span className="text-[11px] text-muted-foreground line-through block font-semibold leading-none mb-0.5">
                            {brl.format(pricingDetails.originalPrice)}
                          </span>
                        )}
                        <span className="font-extrabold text-sm sm:text-base text-foreground block leading-tight">
                          {brl.format(pricingDetails.actualPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* O que o cliente está adquirindo (Especificações do Plano) */}
              <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="size-3 text-primary" />
                  <span>Incluso no plano:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  {(productType === "apps" || product.data?.name?.includes("PaaS") || product.data?.name?.includes("MB") || product.data?.name?.includes("GB") || product.data?.name?.includes("Bot")) && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Check className="size-3 text-primary shrink-0" />
                        <span className="truncate">Cluster Docker Swarm HA</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="size-3 text-primary shrink-0" />
                        <span className="truncate">Bots WhatsApp & APIs</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="size-3 text-primary shrink-0" />
                        <span className="truncate">Deploy Git e SSL Grátis</span>
                      </div>
                    </>
                  )}
                  {productType === "hosting" && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Check className="size-3 text-primary shrink-0" />
                        <span className="truncate">Painel DirectAdmin PT-BR</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="size-3 text-primary shrink-0" />
                        <span className="truncate">{product.data?.disk_quota_mb ? `${Math.round(product.data.disk_quota_mb / 1024)} GB NVMe` : "Disco NVMe"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="size-3 text-primary shrink-0" />
                        <span className="truncate">PHP 8.x, MySQL & E-mails</span>
                      </div>
                    </>
                  )}
                  {productType === "vps" && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Check className="size-3 text-primary shrink-0" />
                        <span className="truncate">Root SSH Total</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="size-3 text-primary shrink-0" />
                        <span className="truncate">IPv4 Dedicado Próprio</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="size-3 text-primary shrink-0" />
                        <span className="truncate">Proteção Anti-DDoS 24/7</span>
                      </div>
                    </>
                  )}
                  {domain && (
                    <div className="col-span-full flex items-center gap-1.5 pt-1 border-t border-border/40 font-mono text-[11px] text-foreground truncate">
                      <Globe className="size-3 text-primary shrink-0" />
                      <span className="truncate">{domain}</span>
                    </div>
                  )}
                  {productType === "vps" && vpsConfig.hostname && (
                    <div className="col-span-full flex items-center gap-1.5 pt-1 border-t border-border/40 font-mono text-[11px] text-foreground truncate">
                      <Server className="size-3 text-primary shrink-0" />
                      <span className="truncate">{vpsConfig.hostname} ({vpsConfig.os || 'Linux'})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Forma de Pagamento Selecionada (na etapa de pagamento) */}
              {steps[step - 1] === "Pagamento" && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-card border border-border/70 text-xs shadow-2xs">
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <CreditCard className="size-3 text-primary" /> Meio de Pagamento:
                  </span>
                  <span className="font-bold text-[11px] text-foreground">
                    {paymentMethod === "pix"
                      ? "PIX Instantâneo"
                      : paymentMethod === "wallet"
                      ? "Saldo da Carteira"
                      : paymentMethod === "credit_card"
                      ? "Cartão de Crédito"
                      : "Boleto Bancário"}
                  </span>
                </div>
              )}

              {/* Discriminativo Financeiro Compacto */}
              <div className="space-y-1 border-t border-sidebar-border pt-2 text-xs">
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Subtotal do plano:</span>
                  <span className="font-medium text-foreground">
                    {pricingDetails.hasDiscount ? (
                      <span className="space-x-1.5">
                        <span className="line-through text-muted-foreground/70">{brl.format(pricingDetails.originalPrice)}</span>
                        <span>{brl.format(pricingDetails.actualPrice)}</span>
                      </span>
                    ) : (
                      brl.format(pricingDetails.actualPrice)
                    )}
                  </span>
                </div>
                {pricingDetails.hasDiscount && (
                  <div className="flex justify-between text-lime-600 dark:text-lime-400 text-[11px] font-medium">
                    <span>Desconto do ciclo ({pricingDetails.savingsPercent}% OFF):</span>
                    <span className="font-bold">-{brl.format(pricingDetails.savingsAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Taxa de instalação (Setup):</span>
                  <span className="font-semibold text-lime-600 dark:text-lime-400">Grátis</span>
                </div>
                <div className="flex justify-between items-end pt-1 border-t border-sidebar-border">
                  <div>
                    <span className="font-bold text-xs text-foreground leading-none block">Total hoje:</span>
                    <span className="text-[10px] text-muted-foreground">Ativação imediata</span>
                  </div>
                  <div className="text-right">
                    {pricingDetails.hasDiscount && (
                      <span className="text-xs text-muted-foreground line-through block font-semibold leading-none mb-1">
                        {brl.format(pricingDetails.originalPrice)}
                      </span>
                    )}
                    <span className="text-xl font-black text-primary leading-none block">
                      {brl.format(pricingDetails.actualPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Se estiver na etapa de Pagamento, exibe os detalhes do saldo/método e o botão de pagar */}
              {steps[step - 1] === "Pagamento" && (
                <div className="pt-2 border-t border-sidebar-border space-y-2">
                  {paymentMethod === "wallet" && (
                    <div className="space-y-1 p-2 border rounded-xl bg-primary/5 border-primary/20 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Saldo Disponível:</span>
                        <span className="font-bold text-foreground">{brl.format(walletBalance)}</span>
                      </div>
                      <div className="flex justify-between pt-0.5 border-t border-primary/20">
                        <span className="text-muted-foreground">Saldo Restante:</span>
                        <span
                          className={cn(
                            "font-bold",
                            walletBalance >= Number(currentPrice?.price ?? 0)
                              ? "text-lime-600 dark:text-lime-400"
                              : "text-destructive"
                          )}
                        >
                          {brl.format(walletBalance - Number(currentPrice?.price ?? 0))}
                        </span>
                      </div>
                    </div>
                  )}

                  {!pixResult && (
                    <Button
                      onClick={() => {
                        setHasStartedAutoPix(true);
                        orderMutation.mutate();
                      }}
                      disabled={isNextDisabled() || isProcessingPix}
                      className={cn(
                        "w-full h-10 rounded-xl text-xs font-bold shadow-md gap-2 cursor-pointer transition-all",
                        paymentMethod === "wallet"
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : ""
                      )}
                    >
                      {isProcessingPix ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin size-3.5 border-2 border-background border-t-transparent rounded-full" />
                          {paymentMethod === "wallet" ? "Liquidando..." : "Processando..."}
                        </span>
                      ) : paymentMethod === "wallet" ? (
                        <>
                          <CheckCircle2 className="size-3.5" /> Confirmar e Pagar com Saldo
                        </>
                      ) : paymentMethod === "pix" ? (
                        <>
                          <QrCode className="size-3.5" /> Gerar PIX e Pagar
                        </>
                      ) : (
                        <>
                          <CreditCard className="size-3.5" /> Pagar Agora
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
