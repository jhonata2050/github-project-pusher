import { useMemo, useEffect } from "react";
import type { PricingDetails } from "../types";

export interface UseCheckoutPricingParams {
  productData: any;
  billingCycle: string;
  setBillingCycle: (cycle: string) => void;
}

export function useCheckoutPricing({
  productData,
  billingCycle,
  setBillingCycle,
}: UseCheckoutPricingParams) {
  const activePrices = useMemo(
    () => (productData?.product_prices || []).filter((p: any) => p.is_active !== false),
    [productData]
  );

  // Seleciona automaticamente o primeiro ciclo disponível
  useEffect(() => {
    if (!billingCycle && activePrices.length > 0) {
      const monthly = activePrices.find((p: any) => p.cycle === "monthly");
      const chosen = monthly ?? activePrices[0];
      if (chosen?.cycle) setBillingCycle(chosen.cycle);
    }
  }, [activePrices, billingCycle, setBillingCycle]);

  const currentPrice = useMemo(() => {
    return (
      productData?.product_prices?.find((p: any) => p.cycle === billingCycle) ||
      productData?.product_prices?.[0]
    );
  }, [productData, billingCycle]);

  const pricingDetails: PricingDetails = useMemo(() => {
    const cycle = billingCycle || currentPrice?.cycle || "monthly";
    const actualPrice = Number(currentPrice?.price ?? 0);
    const monthlyPrice = Number(
      productData?.product_prices?.find((pr: any) => pr.cycle === "monthly")?.price || 0
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
    } else if (
      Number(
        (currentPrice as any)?.original_price ||
          (currentPrice as any)?.compare_at_price ||
          0
      ) > actualPrice
    ) {
      originalPrice = Number(
        (currentPrice as any)?.original_price ||
          (currentPrice as any)?.compare_at_price
      );
    } else if (
      Number(
        (productData as any)?.compare_at_price ||
          (productData as any)?.original_price ||
          0
      ) > actualPrice
    ) {
      originalPrice = Number(
        (productData as any)?.compare_at_price ||
          (productData as any)?.original_price
      );
    }

    const hasDiscount = originalPrice > actualPrice && actualPrice > 0;
    const savingsAmount = hasDiscount ? originalPrice - actualPrice : 0;
    const savingsPercent =
      hasDiscount && originalPrice > 0
        ? Math.round((savingsAmount / originalPrice) * 100)
        : 0;

    return {
      cycle,
      actualPrice,
      originalPrice,
      hasDiscount,
      savingsAmount,
      savingsPercent,
    };
  }, [productData, billingCycle, currentPrice]);

  return {
    activePrices,
    currentPrice,
    pricingDetails,
  };
}
