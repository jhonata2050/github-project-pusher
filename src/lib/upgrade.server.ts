import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getAvailableUpgradesImplementation(serviceId: string, userId: string) {
  // 1. Buscar o serviço atual
  const { data: service, error: sError } = await supabaseAdmin
    .from("services")
    .select("*, products(*, product_prices(*))")
    .eq("id", serviceId)
    .single();

  if (sError || !service) throw new Error("Serviço não encontrado");

  // Validar permissão
  if (service.user_id !== userId) {
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado");
  }

  const currentProduct = (service as any).products;
  if (!currentProduct) throw new Error("Produto do serviço não encontrado");

  // Determinar preço atual do ciclo
  const cycle = service.billing_cycle || "monthly";
  const currentPrices = currentProduct.product_prices || [];
  const currentCyclePriceObj = currentPrices.find((p: any) => p.cycle === cycle && p.is_active) 
    || currentPrices.find((p: any) => p.cycle === "monthly" && p.is_active);
  
  const currentPrice = currentCyclePriceObj ? Number(currentCyclePriceObj.price) : Number(currentProduct.price || 0);

  // 2. Buscar produtos candidatos para upgrade
  let query = supabaseAdmin
    .from("products")
    .select("*, product_prices(*)")
    .eq("is_active", true);

  if (currentProduct.product_type) {
    query = query.eq("product_type", currentProduct.product_type);
  }
  if (currentProduct.group_id) {
    // Busca do mesmo grupo prioritariamente
    query = query.eq("group_id", currentProduct.group_id);
  }

  const { data: candidateProducts, error: pError } = await query;
  if (pError) throw pError;

  // Calcular dias restantes até o próximo vencimento (Prorata)
  const now = Date.now();
  let daysRemaining = 30;
  if (service.next_due_date) {
    const dueTime = new Date(service.next_due_date).getTime();
    const diffDays = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));
    daysRemaining = Math.max(1, Math.min(30, diffDays));
  }

  // 3. REGRA ESTRETA: Apenas UPGRADE (targetPrice > currentPrice)
  // Bloquear qualquer opção de downgrade
  const upgrades = (candidateProducts || [])
    .filter((p: any) => p.id !== currentProduct.id)
    .map((product: any) => {
      const prices = product.product_prices || [];
      const targetPriceObj = prices.find((p: any) => p.cycle === cycle && p.is_active)
        || prices.find((p: any) => p.cycle === "monthly" && p.is_active);
      
      const targetPrice = targetPriceObj ? Number(targetPriceObj.price) : Number(product.price || 0);

      // Bloqueia downgrade: apenas produtos com valor maior
      if (targetPrice <= currentPrice) {
        return null;
      }

      const monthlyDiff = targetPrice - currentPrice;
      // Cálculo proporcional Prorata
      const prorataAmount = Number(((monthlyDiff / 30) * daysRemaining).toFixed(2));

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        currentPrice,
        targetPrice,
        monthlyDifference: monthlyDiff,
        prorataAmount: Math.max(1.00, prorataAmount),
        daysRemaining,
        productType: product.product_type,
        directadminPackage: product.directadmin_package,
        cpuCores: product.cpu_cores,
        ramGb: product.ram_gb,
        diskGb: product.disk_gb,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.targetPrice - b.targetPrice);

  return {
    service: {
      id: service.id,
      domain: service.domain,
      status: service.status,
      currentProduct: {
        id: currentProduct.id,
        name: currentProduct.name,
        price: currentPrice,
        billingCycle: cycle,
      },
      nextDueDate: service.next_due_date,
      daysRemaining,
    },
    availableUpgrades: upgrades,
  };
}

export async function createUpgradeOrderImplementation(
  serviceId: string, 
  targetProductId: string, 
  userId: string
) {
  // 1. Re-validar o serviço e produto atual
  const { data: service, error: sError } = await supabaseAdmin
    .from("services")
    .select("*, products(*, product_prices(*))")
    .eq("id", serviceId)
    .single();

  if (sError || !service) throw new Error("Serviço não encontrado");
  if (service.user_id !== userId) throw new Error("Acesso negado");

  const currentProduct = (service as any).products;
  const cycle = service.billing_cycle || "monthly";
  const currentPrices = currentProduct.product_prices || [];
  const currentPriceObj = currentPrices.find((p: any) => p.cycle === cycle && p.is_active) 
    || currentPrices.find((p: any) => p.cycle === "monthly" && p.is_active);
  const currentPrice = currentPriceObj ? Number(currentPriceObj.price) : Number(currentProduct.price || 0);

  // 2. Buscar o novo produto de destino
  const { data: targetProduct, error: tError } = await supabaseAdmin
    .from("products")
    .select("*, product_prices(*)")
    .eq("id", targetProductId)
    .single();

  if (tError || !targetProduct) throw new Error("Produto de destino não encontrado");

  const targetPrices = targetProduct.product_prices || [];
  const targetPriceObj = targetPrices.find((p: any) => p.cycle === cycle && p.is_active)
    || targetPrices.find((p: any) => p.cycle === "monthly" && p.is_active);
  const targetPrice = targetPriceObj ? Number(targetPriceObj.price) : Number(targetProduct.price || 0);

  // SEGURANÇA: Bloqueio estrito contra Downgrade
  if (targetPrice <= currentPrice) {
    throw new Error("Operação inválida: Apenas upgrades para planos superiores são permitidos.");
  }

  // 3. Calcular Prorata
  const now = Date.now();
  let daysRemaining = 30;
  if (service.next_due_date) {
    const dueTime = new Date(service.next_due_date).getTime();
    const diffDays = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));
    daysRemaining = Math.max(1, Math.min(30, diffDays));
  }

  const monthlyDiff = targetPrice - currentPrice;
  const prorataAmount = Math.max(1.00, Number(((monthlyDiff / 30) * daysRemaining).toFixed(2)));

  // 4. Criar Pedido de Upgrade
  const { data: order, error: oError } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: userId,
      total_amount: prorataAmount,
      status: "pending",
    })
    .select()
    .single();

  if (oError || !order) throw new Error("Falha ao criar o pedido de upgrade");

  // 5. Criar Fatura de Upgrade
  const { data: invoice, error: iError } = await supabaseAdmin
    .from("invoices")
    .insert({
      user_id: userId,
      order_id: order.id,
      total_amount: prorataAmount,
      subtotal: prorataAmount,
      discount_amount: 0,
      due_date: new Date().toISOString(),
      status: "pending",
      payment_method: "pix",
    })
    .select()
    .single();

  if (iError || !invoice) throw new Error("Falha ao gerar a fatura de upgrade");

  // 6. Criar Item de Fatura com Metadados de Upgrade
  await supabaseAdmin.from("invoice_items").insert({
    invoice_id: invoice.id,
    service_id: service.id,
    description: `Upgrade de Plano: ${currentProduct.name} ➔ ${targetProduct.name} (Prorata: ${daysRemaining} dias restantes)`,
    amount: prorataAmount,
  });

  return {
    invoiceId: invoice.id,
    orderId: order.id,
    prorataAmount,
    targetProductName: targetProduct.name,
  };
}
