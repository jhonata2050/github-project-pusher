import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createDAAccount } from "./directadmin.server";


export type BillingCycle =
  | "monthly"
  | "quarterly"
  | "semiannually"
  | "annually"
  | "biennially";

export async function placeOrder(
  userId: string,
  data: {
    productId: string;
    billingCycle: BillingCycle;
    couponCode?: string | undefined;
    domain?: string | undefined;
  },
) {
  const { data: product, error: pError } = await supabaseAdmin
    .from("products")
    .select("*, product_prices(*)")
    .eq("id", data.productId)
    .single();

  if (pError || !product) throw new Error("Produto não encontrado");

  const price = (product as any).product_prices?.find(
    (p: any) => p.cycle === data.billingCycle && p.is_active,
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

  const { data: order, error: oError } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: userId,
      coupon_id: couponId,
      total_amount: totalAmount,
      status: "pending",
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

export async function fetchInvoiceDetails(userId: string, id: string) {
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !invoice) throw new Error("Fatura não encontrada");
  return invoice;
}

export async function processProvisioning(invoiceId: string) {
  const { data: invoice, error: iError } = await supabaseAdmin
    .from("invoices")
    .select("*, invoice_items(*, services(*, products(*)))")
    .eq("id", invoiceId)
    .single();

  if (iError || !invoice) throw new Error("Fatura não encontrada");
  if (invoice.status !== "paid") return { success: false, message: "Fatura não está paga" };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", invoice.user_id)
    .single();

  for (const item of (invoice as any).invoice_items) {
    const service = item.services;
    const product = service?.products;

    if (service && service.status === "pending" && product?.directadmin_package) {
      // Find a server to provision
      const { data: server } = await supabaseAdmin
        .from("servers")
        .select("*")
        .limit(1)
        .single();

      if (server) {
        try {
          const username = `u${Math.random().toString(36).slice(-7)}`;
          const domain = service.domain || `${username}.temp.hostpanel.app`;
          
          await createDAAccount(server.id, {
            username,
            domain,
            email: profile?.email || "user@example.com",
            package: product.directadmin_package
          });

          await supabaseAdmin
            .from("services")
            .update({
              status: "active",
              username,
              server_id: server.id,
              domain,
              next_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            } as any)
            .eq("id", service.id);


          console.log(`Provisioned service ${service.id} on server ${server.name}`);
        } catch (err: any) {
          console.error(`Provisioning error: ${err.message}`);
        }
      }
    }
  }

  return { success: true };
}

