import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createDAAccount } from "./directadmin.server";
import { notifyAdminWhatsApp, sendWhatsAppMessage } from "./whatsapp.server";
import { logProvisioningAttempt } from "./provisioning-audit.server";




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
    vpsConfig?: {
      hostname: string;
      os: string;
      location: string;
    } | undefined;
  },
) {
  const { data: product, error: pError } = await supabaseAdmin
    .from("products")
    .select("*, product_prices(*)")
    .eq("id", data.productId)
    .single();

  if (pError || !product) throw new Error("Produto não encontrado");

  const isVpsProduct = product.product_type === "vps";
  if (isVpsProduct && (!data.vpsConfig?.hostname || !data.vpsConfig.os || !data.vpsConfig.location)) {
    throw new Error("Preencha hostname, sistema operacional e localização da VPS");
  }

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

  const affNotes = data.affCode ? `aff:${data.affCode.trim()}` : null;

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

export async function fetchInvoiceDetails(supabaseClient: any, userId: string, id: string) {
  // 1. Tenta buscar usando o cliente autenticado (suporta dono da fatura e admins via RLS)
  const { data: invoice, error } = await supabaseClient
    .from("invoices")
    .select("*, invoice_items(*), profiles(*)")
    .eq("id", id)
    .maybeSingle();

  if (invoice) return invoice;

  // 2. Se a query detalhada com join profiles falhou por restrição de FK, tenta query básica
  const { data: basicInvoice, error: basicError } = await supabaseClient
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (basicInvoice) {
    if (basicInvoice.user_id) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", basicInvoice.user_id)
        .maybeSingle();
      return { ...basicInvoice, profiles: profile || null };
    }
    return basicInvoice;
  }

  // 3. Fallback adicional usando supabaseAdmin caso seja impersonation de admin
  const { data: adminInvoice } = await supabaseAdmin
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (adminInvoice) {
    if (adminInvoice.user_id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", adminInvoice.user_id)
        .maybeSingle();
      return { ...adminInvoice, profiles: profile || null };
    }
    return adminInvoice;
  }

  if (error || basicError) {
    console.error("[fetchInvoiceDetails] Erro:", error?.message || basicError?.message);
  }

  throw new Error("Fatura não encontrada ou acesso negado");
}

export async function processProvisioning(invoiceId: string) {
  console.log(`[Provisioning] Iniciando processamento para fatura #${invoiceId}`);
  
  const { data: invoice, error: iError } = await supabaseAdmin
    .from("invoices")
    .select("*, invoice_items(*, services(*, products(*)))")
    .eq("id", invoiceId)
    .single();

  if (iError || !invoice) {
    console.error(`[Provisioning] Erro ao buscar fatura #${invoiceId}:`, iError);
    throw new Error("Fatura não encontrada");
  }
  
  if (invoice.status !== "paid") {
    console.warn(`[Provisioning] Abortando: fatura #${invoiceId} tem status ${invoice.status}`);
    return { success: false, message: "Fatura não está paga" };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", invoice.user_id)
    .single();

  let results = [];

  for (const item of (invoice as any).invoice_items) {
    const service = item.services;
    const product = service?.products;

    // Caso Especial: Fatura de ADIÇÃO DE SALDO NA CARTEIRA (Depósito)
    if (item.description?.includes("Adição de Saldo na Carteira") || item.description?.includes("Recarga de Saldo")) {
      console.log(`[Provisioning] Creditando saldo na carteira para fatura #${invoiceId}`);
      try {
        const depositAmount = Number(item.amount || invoice.total_amount);
        const { data: userProfile } = await supabaseAdmin
          .from("profiles")
          .select("account_balance, full_name, phone")
          .eq("id", invoice.user_id)
          .single();

        const currentBal = Number(userProfile?.account_balance || 0);
        const updatedBal = Number((currentBal + depositAmount).toFixed(2));

        await supabaseAdmin
          .from("profiles")
          .update({
            account_balance: updatedBal,
            updated_at: new Date().toISOString()
          })
          .eq("id", invoice.user_id);

        try {
          await supabaseAdmin.from("wallet_transactions").insert({
            user_id: invoice.user_id,
            type: "deposit",
            amount: depositAmount,
            balance_after: updatedBal,
            description: `Recarga de saldo via ${invoice.payment_method?.toUpperCase() || 'PIX'} (Fatura #${invoice.id.slice(0, 8)})`,
            invoice_id: invoice.id,
          });
        } catch (e) {}

        if (userProfile?.phone) {
          try {
            const { sendWhatsAppMessage } = await import("./whatsapp.server");
            await sendWhatsAppMessage({
              to: userProfile.phone,
              message: `💰 *Saldo Creditado com Sucesso!*\n\nOlá ${userProfile.full_name},\nSua recarga de *R$ ${depositAmount.toFixed(2)}* foi confirmada e adicionada à sua carteira!\n\nSeu novo saldo disponível é: *R$ ${updatedBal.toFixed(2)}*.`,
              category: "wallet_deposit"
            });
          } catch (wErr) {
            console.warn("[WhatsApp] Falha ao enviar notificação de recarga:", wErr);
          }
        }

        // Automação: Se o cliente possuía faturas pendentes aguardando saldo, auto-pagar imediatamente
        try {
          const { autoPayPendingInvoices } = await import("./wallet.server");
          await autoPayPendingInvoices(invoice.user_id);
        } catch (autoErr) {
          console.warn("[Wallet AutoPay] Aviso:", autoErr);
        }

        results.push({ success: true, message: `Saldo de R$ ${depositAmount.toFixed(2)} creditado` });
        continue;
      } catch (depErr: any) {
        console.error("[Provisioning] Erro ao creditar saldo na carteira:", depErr.message);
        results.push({ success: false, error: depErr.message });
        continue;
      }
    }

    // Caso Especial: Fatura de REGISTRO DE DOMÍNIO
    if (item.description?.includes("Registro de Domínio:") || item.description?.includes("Domínio:")) {
      console.log(`[Provisioning] Processando registro de domínio para fatura #${invoiceId}`);
      try {
        const desc = item.description || "";
        const domainMatch = desc.match(/Registro de Domínio:\s*([a-zA-Z0-9.-]+)/i) || desc.match(/Domínio:\s*([a-zA-Z0-9.-]+)/i);
        const domainName = domainMatch ? domainMatch[1].trim().toLowerCase() : null;

        if (domainName) {
          const { getDomainRegistrarSettings } = await import("./domains.server");
          const settings = await getDomainRegistrarSettings();
          const defaultNs = [settings.defaultNs1 || "ns1.eqsam.com", settings.defaultNs2 || "ns2.eqsam.com"];

          let registrarUsed = "openprovider";

          // Se houver credenciais Openprovider configuradas, chama a API
          if (settings.openproviderUsername) {
            try {
              const { OpenproviderRegistrar } = await import("./registrars/openprovider.server");
              const { data: passRow } = await supabaseAdmin
                .from("system_settings")
                .select("value")
                .eq("key", "openprovider_password")
                .maybeSingle();

              const openprovider = new OpenproviderRegistrar(
                settings.openproviderUsername,
                passRow?.value || "",
                settings.openproviderTestMode
              );

              // Extrair extensão
              const parts = domainName.split('.');
              const ext = parts.length > 2 && parts[parts.length - 1] === 'br' 
                ? `.${parts[parts.length - 2]}.${parts[parts.length - 1]}` 
                : `.${parts[parts.length - 1]}`;

              await openprovider.registerDomain({
                domainName,
                extension: ext,
                periodYears: 1,
                nameservers: defaultNs,
                customerData: {
                  name: profile?.full_name || "Cliente",
                  email: profile?.email || "contato@eqsam.com",
                  phone: profile?.phone || "+5511999999999",
                  document: profile?.document || undefined,
                }
              });
              console.log(`[Openprovider] Domínio ${domainName} registrado com sucesso na API!`);
            } catch (regErr: any) {
              console.warn(`[Openprovider] Aviso ao registrar na API (salvando no banco):`, regErr.message);
            }
          }

          // Salvar ou atualizar o domínio no banco de dados
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);

          await supabaseAdmin.from("domains").upsert({
            user_id: invoice.user_id,
            domain_name: domainName,
            status: "active",
            registrar: registrarUsed,
            registration_date: new Date().toISOString(),
            expiry_date: expiryDate.toISOString(),
            nameservers: defaultNs,
            auto_renew: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "domain_name" });

          if (profile?.phone) {
            try {
              const { sendWhatsAppMessage } = await import("./whatsapp.server");
              await sendWhatsAppMessage({
                to: profile.phone,
                message: `🌐 *Domínio Registrado com Sucesso!*\n\nOlá ${profile.full_name},\nSeu domínio *${domainName}* foi registrado e ativado com sucesso!\n\nVocê já pode gerenciar os Nameservers DNS diretamente no seu painel.`,
                category: "domain_registered"
              });
            } catch (e) {
              console.warn("[WhatsApp] Falha ao enviar notificação de domínio:", e);
            }
          }

          results.push({ domainName, success: true, message: "Domínio registrado e ativado com sucesso" });
        }
        continue;
      } catch (dErr: any) {
        console.error(`[Provisioning] Erro no registro de domínio:`, dErr.message);
        results.push({ success: false, error: dErr.message });
        continue;
      }
    }

    if (!service) {
      console.warn(`[Provisioning] Item da fatura sem serviço associado. Fatura: #${invoiceId}`);
      continue;
    }

    // Caso Especial: Fatura de UPGRADE de plano para serviço já existente
    if (item.description?.includes("Upgrade de Plano:") || item.description?.includes("Upgrade:")) {
      console.log(`[Provisioning] Processando upgrade de plano para o serviço ${service.id}`);
      try {
        // Obter pedido para localizar o target_product_id se necessário
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("id", invoice.order_id)
          .maybeSingle();

        // Se o serviço está associado ao DirectAdmin, alterar o pacote no servidor
        if (service.server_id && service.username && product?.directadmin_package) {
          const { modifyDAUserPackage } = await import("./directadmin.server");
          await modifyDAUserPackage(service.server_id, service.username, product.directadmin_package);
          console.log(`[Provisioning] Pacote DirectAdmin atualizado para '${product.directadmin_package}' no usuário ${service.username}`);
        }

        await supabaseAdmin.from("services").update({
          notes: `Upgrade aplicado para ${product.name} em ${new Date().toLocaleDateString('pt-BR')}`,
          updated_at: new Date().toISOString()
        }).eq("id", service.id);

        if (profile?.phone) {
          try {
            await sendWhatsAppMessage({
              to: profile.phone,
              message: `🚀 *Upgrade Concluído com Sucesso!*\n\nOlá ${profile.full_name},\nSeu plano foi atualizado para *${product.name}* com novos recursos liberados imediatamente!`,
              category: "service_upgrade"
            });
          } catch (e) {
            console.warn("[WhatsApp] Falha ao enviar notificação de upgrade:", e);
          }
        }

        results.push({ serviceId: service.id, success: true, message: "Upgrade aplicado com sucesso" });
        continue;
      } catch (err: any) {
        console.error(`[Provisioning] Erro ao aplicar upgrade no serviço ${service.id}:`, err.message);
        results.push({ serviceId: service.id, success: false, error: err.message });
        continue;
      }
    }

    if (service.status !== "pending") {
      console.log(`[Provisioning] Serviço ${service.id} já está ${service.status}. Pulando.`);
      continue;
    }

    // 1. Caso: Hospedagem via DirectAdmin
    if (product?.directadmin_package) {
      console.log(`[Provisioning] Provisionando hospedagem DirectAdmin para serviço ${service.id}`);
      
      const { data: server } = await supabaseAdmin
        .from("servers")
        .select("*")
        .limit(1)
        .single();

      if (!server) {
        const errorMsg = "Nenhum servidor DirectAdmin disponível para provisionamento automático.";
        console.error(`[Provisioning] ${errorMsg}`);
        
        await logProvisioningAttempt({
          serviceId: service.id,
          userId: invoice.user_id,
          status: 'failure',
          errorCode: 'NO_SERVER_AVAILABLE',
          errorMessage: errorMsg,
          metadata: { productId: product.id }
        });

        await supabaseAdmin.from("services").update({ 
          notes: `ERRO CRÍTICO: ${errorMsg}`,
          status: "pending"
        }).eq("id", service.id);
        
        results.push({ serviceId: service.id, success: false, error: errorMsg });
        continue;
      }


      try {
        const username = service.username || `u${Math.random().toString(36).slice(-7)}`;
        const domain = service.domain || `${username}.temp.eqsam.com`;
        
        // Verificar se já existe para evitar conflito de domínio fatal
        const alreadyExists = await (await import("./directadmin.server")).checkDAUserExists(server.id, username, service.id);
        if (alreadyExists) {
          throw new Error(`Conflito: O usuário/domínio ${username} já está em uso neste servidor.`);
        }

        const result = await createDAAccount(server.id, {
          username,
          domain,
          email: profile?.email || "user@example.com",
          package: product.directadmin_package
        }) as any;

        // Validar se o DA retornou erro no corpo (mesmo com status 200)
        if (result && (result['error'] === '1' || result['error'] === 1)) {
          throw new Error(String(result['details'] || result['text'] || "O servidor DirectAdmin recusou a criação da conta."));
        }

        // REGRA WHMCS: Senha do DirectAdmin é salva no serviço, separada da senha do Lovable
        await supabaseAdmin
          .from("services")
          .update({
            status: "active",
            username,
            server_id: server.id,
            domain,
            password: result.daPassword || null, // Armazena a senha gerada
            next_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            notes: "Provisionado automaticamente via DirectAdmin (Senha gerada e isolada)"
          } as any)
          .eq("id", service.id);

        await logProvisioningAttempt({
          serviceId: service.id,
          userId: invoice.user_id,
          status: 'success',
          metadata: { username, domain, serverId: server.id }
        });

        console.log(`[Provisioning] Sucesso: serviço ${service.id} ativo no servidor ${server.id}`);


        // Notificações via WhatsApp
        try {
          if (profile?.phone) {
            await sendWhatsAppMessage({
              to: profile.phone,
              message: `✅ *Serviço Ativo!*\n\nOlá ${profile.full_name},\nSeu serviço *${product.name}* foi ativado com sucesso!\n\n*Domínio:* ${domain}\n*Usuário:* ${username}\n\nObrigado por escolher nossa plataforma!`,
              category: "service_activation"
            });
          }

          await notifyAdminWhatsApp(
            `🚀 *Serviço Provisionado*\n\n*Produto:* ${product.name}\n*Cliente:* ${profile?.full_name}\n*Domínio:* ${domain}`,
            "service_activation"
          );
        } catch (e) {
          console.warn("[WhatsApp] Falha ao enviar notificações:", e);
        }
        
        results.push({ serviceId: service.id, success: true });
      } catch (err: any) {
        const errorDetail = err.message || "Erro desconhecido na API";
        console.error(`[Provisioning] Erro na API DirectAdmin para serviço ${service.id}:`, errorDetail);
        
        await logProvisioningAttempt({
          serviceId: service.id,
          userId: invoice.user_id,
          status: 'failure',
          errorCode: 'API_ERROR',
          errorMessage: errorDetail,
          metadata: { error: err }
        });

        await supabaseAdmin.from("services").update({ 
          notes: `FALHA API: ${errorDetail}`,
          status: "pending"
        }).eq("id", service.id);

        results.push({ serviceId: service.id, success: false, error: errorDetail });

      }
    } 
    // 2. Caso: Instância VPS
    else if (product?.product_type === 'vps') {
      console.log(`[Provisioning] Provisionando VPS para o serviço ${service.id}.`);

      try {
        const { provisionContaboVPS } = await import("./contabo.server");
        const provisioned = await provisionContaboVPS(service.id, {
          productId: product.external_id,
          hostname: service.vps_hostname,
          imageId: service.vps_os_template,
          region: service.vps_region,
          billingCycle: service.billing_cycle,
        });

        await logProvisioningAttempt({
          serviceId: service.id,
          userId: invoice.user_id,
          status: 'success',
          metadata: { externalId: provisioned.externalId, providerStatus: provisioned.status }
        });

        results.push({ serviceId: service.id, success: true, externalId: provisioned.externalId });
      } catch (err: any) {
        const errorDetail = err?.message || "Falha desconhecida ao provisionar a VPS";
        await supabaseAdmin.from("services").update({
          notes: `Falha no provisionamento automático da VPS: ${errorDetail}`,
          status: "pending",
          error_message: errorDetail,
        }).eq("id", service.id);
        await logProvisioningAttempt({
          serviceId: service.id,
          userId: invoice.user_id,
          status: 'failure',
          errorCode: 'VPS_API_ERROR',
          errorMessage: errorDetail,
          metadata: { productId: product.id, externalProductId: product.external_id }
        });
        results.push({ serviceId: service.id, success: false, error: errorDetail });
      }
    }
    // 3. Caso: Aplicações & Bots (Coolify PaaS)
    else if (product?.product_type === 'app' || product?.product_type === 'bot' || product?.product_type === 'coolify') {
      console.log(`[Provisioning] Provisionando Aplicação PaaS no Coolify para o serviço ${service.id}.`);
      try {
        const { provisionCoolifyApplication } = await import("./coolify.server");
        const app = await provisionCoolifyApplication(service.id, {
          name: service.domain || product.name,
          memoryLimit: product.disk_quota_mb || 512,
          cpuLimit: 1.0,
        });

        results.push({ serviceId: service.id, success: true, appId: app.id, appUuid: app.coolify_app_uuid });
      } catch (err: any) {
        const errorDetail = err?.message || "Falha ao provisionar container Coolify";
        await supabaseAdmin.from("services").update({
          notes: `Falha no provisionamento Coolify: ${errorDetail}`,
          status: "pending",
        }).eq("id", service.id);
        results.push({ serviceId: service.id, success: false, error: errorDetail });
      }
    }
    else {
      console.log(`[Provisioning] Produto sem regras de auto-provisionamento para serviço ${service.id}`);
      results.push({ serviceId: service.id, success: true, message: "Sem provisionamento automático" });
    }
  }

  return { success: true, results };
}

/**
 * Função centralizada para processar sucesso de pagamento de qualquer gateway.
 */
export async function handlePaymentSuccess(
  invoiceId: string, 
  gatewayName: string, 
  externalReference?: string
) {
  try {
    console.log(`[Finance] Processando pagamento fatura #${invoiceId} via ${gatewayName}`);

    // 1. Buscar fatura e perfil do cliente
    const { data: invoice, error: iError } = await supabaseAdmin
      .from("invoices")
      .select("*, profiles(*)")
      .eq("id", invoiceId)
      .single();

    if (iError || !invoice) {
      throw new Error(`Fatura #${invoiceId} não encontrada.`);
    }

    if (invoice.status === "paid") {
      console.log(`[Finance] Fatura #${invoiceId} já está marcada como paga.`);
      return { success: true, already_paid: true };
    }

    // 2. Atualizar fatura
    const { data: updatedInvoice, error: updateError } = await supabaseAdmin
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: gatewayName
      })
      .eq("id", invoiceId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Atualizar transação relacionada (se houver referência)
    if (externalReference) {
      const { error: tUpdateError } = await supabaseAdmin
        .from("transactions")
        .update({ 
          status: "completed",
          updated_at: new Date().toISOString()
        })
        .eq("gateway_reference", externalReference.toString());
      
      if (tUpdateError) console.warn(`[Finance] Aviso: Não foi possível atualizar transação ${externalReference}:`, tUpdateError.message);
    }

    // 4. Provisionar serviços
    await processProvisioning(invoiceId);

    // 4.1 Processar comissão de afiliados se houver indicação
    try {
      const { processAffiliateCommission } = await import("./affiliates.server");
      await processAffiliateCommission(invoiceId);
    } catch (affErr: any) {
      console.warn(`[Affiliates] Aviso ao processar comissão para fatura #${invoiceId}:`, affErr.message);
    }

    // 5. Notificações
    const profile = invoice.profiles;
    const amountStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(invoice.total_amount || 0));

    // Notificar Admin
    await notifyAdminWhatsApp(
      `💰 *Pagamento Confirmado*\n\n*Fatura:* #${invoiceId}\n*Valor:* ${amountStr}\n*Gateway:* ${gatewayName}\n*Cliente:* ${profile?.full_name || "N/A"}`,
      "payment_success"
    );

    // Notificar Cliente
    if (profile?.phone) {
      await sendWhatsAppMessage({
        to: profile.phone,
        message: `✅ *Pagamento Recebido!*\n\nOlá ${profile.full_name},\nConfirmamos o recebimento do seu pagamento no valor de ${amountStr}.\n\nSeu serviço está sendo ativado/renovado agora mesmo.`,
        category: "payment_success"
      });
    }

    // 6. Log de auditoria
    await supabaseAdmin.from("audit_logs").insert({
      category: "finance",
      action: "payment.processed",
      status: "success",
      description: `Pagamento processado com sucesso para fatura #${invoiceId} via ${gatewayName}`,
      metadata: { invoiceId, gatewayName, externalReference } as any
    });

    return { success: true };
  } catch (error: any) {
    console.error(`[Finance] Erro ao processar pagamento fatura #${invoiceId}:`, error);
    
    await supabaseAdmin.from("audit_logs").insert({
      category: "finance",
      action: "payment.failed",
      status: "failure",
      description: `Erro ao processar pagamento fatura #${invoiceId}: ${error.message}`,
      metadata: { invoiceId, gatewayName, externalReference, error: error.message } as any
    });

    throw error;
  }
}


