import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { PaymentMethod } from "../gateways";

/**
 * Records a pending payment transaction in the database.
 */
export async function recordTransaction(args: {
  userId: string;
  invoiceId: string;
  amount: number;
  gateway: string;
  reference: string;
  method: PaymentMethod;
  metadata?: Record<string, unknown>;
}): Promise<string | undefined> {
  const { data } = await supabaseAdmin
    .from("transactions")
    .insert({
      user_id: args.userId,
      invoice_id: args.invoiceId,
      amount: args.amount,
      gateway: args.gateway,
      gateway_reference: args.reference,
      status: "pending",
      metadata: { method: args.method, ...(args.metadata || {}) } as any,
    })
    .select()
    .single();
  return data?.id as string | undefined;
}
