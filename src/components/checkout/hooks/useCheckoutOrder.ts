import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createOrder } from "@/lib/finance.functions";
import { initializePayment } from "@/lib/payments.functions";
import { payWithWalletBalance } from "@/lib/wallet.functions";
import type { VPSConfigState } from "../types";

export interface UseCheckoutOrderParams {
  productId: string;
  billingCycle: string;
  domain: string;
  vpsConfig: VPSConfigState;
  productType: string;
  productData: any;
  paymentMethod: string;
  cpfCnpj: string;
  profile: any;
  impersonatedClientId?: string | null | undefined;
  steps: string[];
  setStep: (step: number) => void;
  setPixResult: (res: any) => void;
  setIsProcessingPix: (isProcessing: boolean) => void;
  setHasStartedAutoPix: (started: boolean) => void;
}

export function useCheckoutOrder({
  productId,
  billingCycle,
  domain,
  vpsConfig,
  productType,
  productData,
  paymentMethod,
  cpfCnpj,
  profile,
  impersonatedClientId,
  steps,
  setStep,
  setPixResult,
  setIsProcessingPix,
  setHasStartedAutoPix,
}: UseCheckoutOrderParams) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const executeCreateOrder = useServerFn(createOrder);
  const startPayment = useServerFn(initializePayment);
  const executePayWithBalance = useServerFn(payWithWalletBalance);

  const orderMutation = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        throw new Error("SESSION_REQUIRED");
      }

      const affCode =
        typeof window !== "undefined"
          ? localStorage.getItem("eqsam_aff_code") || undefined
          : undefined;

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
          await supabase
            .from("profiles")
            .update({ tax_id: cpfCnpj.trim() })
            .eq("id", profile.id);
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
          console.log(
            `[Checkout] Iniciando pagamento ${paymentMethod} para fatura ${order.invoiceId}`
          );
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
          if (
            productType === "apps" ||
            productData?.name?.includes("PaaS") ||
            productData?.name?.includes("MB") ||
            productData?.name?.includes("GB")
          ) {
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
          if (
            typeof window !== "undefined" &&
            window.location.pathname.includes("/checkout/")
          ) {
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

  const handlePay = () => {
    setHasStartedAutoPix(true);
    orderMutation.mutate();
  };

  return {
    orderMutation,
    handlePay,
  };
}
