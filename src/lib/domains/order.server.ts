import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkSingleDomain } from "../whois.server";

/**
 * Criar Pedido e Fatura de Registro de Domínio
 */
export async function orderDomainRegistration(
  userId: string,
  domainName: string,
  periodYears = 1
) {
  const check = await checkSingleDomain(domainName);
  if (!check.available) {
    throw new Error(`O domínio ${domainName} não está disponível para registro.`);
  }

  const totalAmount = Number((check.price * periodYears).toFixed(2));

  // Criar Pedido
  const { data: order, error: oError } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: userId,
      total_amount: totalAmount,
      status: "pending",
    })
    .select()
    .single();

  if (oError || !order) throw new Error("Falha ao gerar pedido de domínio");

  // Criar Fatura
  const { data: invoice, error: iError } = await supabaseAdmin
    .from("invoices")
    .insert({
      user_id: userId,
      order_id: order.id,
      total_amount: totalAmount,
      subtotal: totalAmount,
      discount_amount: 0,
      due_date: new Date().toISOString(),
      status: "pending",
      payment_method: "pix",
      notes: `Registro de Domínio: ${domainName} (${periodYears} ano(s))`,
    })
    .select()
    .single();

  if (iError || !invoice) throw new Error("Falha ao gerar fatura");

  // Inserir Item
  await supabaseAdmin.from("invoice_items").insert({
    invoice_id: invoice.id,
    description: `Registro de Domínio: ${domainName} (${periodYears} ano(s))`,
    amount: totalAmount,
  });

  return {
    invoiceId: invoice.id,
    orderId: order.id,
    domainName,
    totalAmount,
  };
}
