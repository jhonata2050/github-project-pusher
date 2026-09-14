import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { PlaceOrderParams } from "./types";

export async function placeOrder(userId: string, data: PlaceOrderParams) {
  const { data: product, error: pError } = await supabaseAdmin
    .from("products")
    .select("*, product_prices(*)")
    .eq("id", data.productId)
    .single();

  if (pError || !product) throw new Error("Produto não encontrado");

  const isVpsProduct = product.product_type === "vps";
  if (
    isVpsProduct &&
    (!data.vpsConfig?.hostname || !data.vpsConfig.os || !data.vpsConfig.location)
  ) {
    throw new Error("Preencha hostname, sistema operacional e localização da VPS");
  }

  const price = (product as any).product_prices?.find(
    (p: any) => p.cycle === data.billingCycle && p.is_active
  );
  if (!price) throw new Error("Preço não encontrado para este ciclo");

  let totalAmount = Number(price.price);
  let discountAmount = 0;
  let couponId: string | null = null;

  if (data.couponCode) {
    const { data: coupon } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("code", data.couponCode)
      .eq("is_active", true)
      .maybeSingle();

    if (coupon) {
      const validDate =
        !coupon.valid_until || new Date(coupon.valid_until) > new Date();
      const validUses =
        !coupon.max_uses || (coupon.used_count || 0) < coupon.max_uses;
      if (validDate && validUses) {
        couponId = coupon.id;
        discountAmount =
          coupon.type === "percentage"
            ? (totalAmount * Number(coupon.value)) / 100
            : Math.min(totalAmount, Number(coupon.value));
        totalAmount -= discountAmount;
      }
    }
  }

  const affCode = (data as any).affCode;
  const affNotes = affCode ? `aff:${affCode.trim()}` : null;

  const { data: order, error: oError } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: userId,
      coupon_id: couponId,
      total_amount: totalAmount,
      status: "pending",
      notes: affNotes,
    })
    .select()
    .single();
  if (oError || !order) throw new Error("Falha ao criar o pedido");

  const { data: service, error: sError } = await supabaseAdmin
    .from("services")
    .insert({
      user_id: userId,
      product_id: data.productId,
      order_id: order.id,
      status: "pending",
      domain: data.domain || null,
      billing_cycle: data.billingCycle,
      vps_hostname: isVpsProduct ? data.vpsConfig?.hostname : null,
      vps_os_template: isVpsProduct ? data.vpsConfig?.os : null,
      vps_region: isVpsProduct ? data.vpsConfig?.location : null,
    })
    .select()
    .single();
  if (sError || !service) throw new Error("Falha ao criar o serviço");

  const { data: invoice, error: iError } = await supabaseAdmin
    .from("invoices")
    .insert({
      user_id: userId,
      order_id: order.id,
      total_amount: totalAmount,
      subtotal: Number(price.price),
      discount_amount: discountAmount,
      due_date: new Date().toISOString(),
      status: "pending",
      notes: affNotes,
    })
    .select()
    .single();
  if (iError || !invoice) throw new Error("Falha ao criar a fatura");

  await supabaseAdmin.from("invoice_items").insert({
    invoice_id: invoice.id,
    service_id: service.id,
    description: `${product.name} - ${data.billingCycle}`,
    amount: Number(price.price),
  });

  if (couponId) {
    await supabaseAdmin.rpc("increment_coupon_uses" as any, {
      _coupon_id: couponId,
    });
  }

  return { orderId: order.id as string, invoiceId: invoice.id as string };
}
