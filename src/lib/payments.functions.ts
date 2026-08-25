import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const paymentInputSchema = z.object({
  invoiceId: z.string(),
  method: z.enum(["pix", "credit_card", "boleto"]),
  gateway: z.string().optional(),
});

export const initializePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => paymentInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { createPaymentSessionWithFallback } = await import("./payments.server");
    
    // Log para depuração
    console.log(`[initializePayment] Iniciando pagamento: Invoice=${data.invoiceId}, Method=${data.method}, Gateway=${data.gateway || 'fallback-auto'}`);
    
    try {
      const result = await createPaymentSessionWithFallback(context.userId, {
        invoiceId: data.invoiceId,
        method: data.method,
        gateway: data.gateway,
      } as any);
      
      console.log(`[initializePayment] Sucesso:`, { 
        gateway: result.gateway, 
        hasUrl: !!result.checkoutUrl,
        hasPix: !!result.pixCode
      });
      
      return result;
    } catch (error: any) {
      console.error(`[initializePayment] Erro crítico:`, error.message);
      throw error;
    }
  });
