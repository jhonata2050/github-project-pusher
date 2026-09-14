import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { getMyWallet } from "@/lib/wallet.functions";
import type { VPSConfigState } from "../types";
import { useCheckoutPricing } from "./useCheckoutPricing";
import { useCheckoutOrder } from "./useCheckoutOrder";

export interface UseCheckoutProductOptions {
  productId: string;
}

export function useCheckoutProduct({ productId }: UseCheckoutProductOptions) {
  const { user, impersonatedClientId } = useAuth();
  const navigate = useNavigate();

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

  const { activePrices, currentPrice, pricingDetails } = useCheckoutPricing({
    productData: product.data,
    billingCycle,
    setBillingCycle,
  });

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
      const searchParams = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : ""
      );
      if (searchParams.get("immediate") === "true") {
        if (productType !== "hosting" && productType !== "vps" && step === 1) {
          const cycleIdx = steps.indexOf("Ciclo de Faturamento");
          if (cycleIdx >= 0) setStep(cycleIdx + 1);
        }
      }
    }
  }, [product.data, productType, steps, step]);

  const { orderMutation, handlePay } = useCheckoutOrder({
    productId,
    billingCycle,
    domain,
    vpsConfig,
    productType,
    productData: product.data,
    paymentMethod,
    cpfCnpj,
    profile,
    impersonatedClientId,
    steps,
    setStep,
    setPixResult,
    setIsProcessingPix,
    setHasStartedAutoPix,
  });

  useEffect(() => {
    if (!user && !product.isLoading) {
      const searchParams = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : ""
      );
      const isImmediate = searchParams.get("immediate") === "true";
      navigate({
        to: "/auth",
        search: {
          redirect: `/checkout/${productId}${isImmediate ? "?immediate=true" : ""}`,
        } as any,
      });
    }
  }, [user, product.isLoading, productId, navigate]);

  const isNextDisabled = () => {
    const currentStepIdx = step - 1;
    const stepName = steps[currentStepIdx];
    if (stepName === "Domínio" && (!domain || !isDomainValid)) return true;
    if (
      stepName === "Configuração" &&
      (!vpsConfig.hostname || !vpsConfig.os || !vpsConfig.location)
    )
      return true;
    if (stepName === "Conta" && !user) return true;
    if (stepName === "Pagamento") {
      const hasTaxId = Boolean(
        (cpfCnpj && cpfCnpj.trim().length > 0) ||
          (profile?.tax_id && profile.tax_id.trim().length > 0)
      );
      if (paymentMethod === "pix" && !hasTaxId) return true;
      if (paymentMethod === "wallet" && walletBalance < Number(currentPrice?.price ?? 0))
        return true;
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

