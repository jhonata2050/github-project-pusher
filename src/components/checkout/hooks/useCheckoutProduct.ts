import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { createOrder } from "@/lib/finance.functions";
import { initializePayment } from "@/lib/payments.functions";
import { getMyWallet, payWithWalletBalance } from "@/lib/wallet.functions";
import type { PricingDetails, VPSConfigState } from "../types";

export interface UseCheckoutProductOptions {
  productId: string;
}

export function useCheckoutProduct({ productId }: UseCheckoutProductOptions) {
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
  const [vpsConfig, setVpsConfig] = useState<VPSConfigState>({ hostname: "", os: "", location: "" });
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

  // Seleciona automaticamente o primeiro ciclo disponível
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

  const pricingDetails: PricingDetails = useMemo(() => {
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

  // Se o cliente tiver saldo suficiente em conta, pré-seleciona a carteira
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
    const list: string[] = [];
    if (productType === "hosting") list.push("Domínio");
    if (productType === "vps") list.push("Configuração");
    list.push("Ciclo de Faturamento");
    if (!user) list.push("Conta");
    list.push("Resumo");
    list.push("Pagamento");
    return list;
  }, [productType, user]);

  // Lógica de Venda Imediata
  useEffect(() => {
    if (product.data?.immediate_purchase) {
      const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
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
        },
      });

      // Se o usuário não possuía documento no perfil e digitou para o PIX, salva para compras futuras (Lei #7)
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
            },
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
            },
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
          if (typeof window !== "undefined" && window.location.pathname.includes("/checkout/")) {
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
    },
  });

  useEffect(() => {
    if (!user && !product.isLoading) {
      const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const isImmediate = searchParams.get("immediate") === "true";
      navigate({
        to: "/auth",
        search: {
          redirect: `/checkout/${productId}${isImmediate ? "?immediate=true" : ""}`,
        } as any,
      });
    }
  }, [user, product.isLoading, productId, navigate]);

  const handlePay = () => {
    setHasStartedAutoPix(true);
    orderMutation.mutate();
  };

  const isNextDisabled = () => {
    const currentStepIdx = step - 1;
    const stepName = steps[currentStepIdx];
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

  return {
    user,
    profile,
    product,
    productType,
    activePrices,
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
    orderMutation,
    handlePay,
    isNextDisabled,
  };
}
