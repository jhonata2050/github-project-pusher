import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const updateServiceDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({
      serviceId: z.string().uuid(),
      username: z.string().nullable().optional(),
      domain: z.string().nullable().optional(),
      server_id: z.string().uuid().nullable().optional(),
      product_id: z.string().uuid().nullable().optional(),
      next_due_date: z.string().nullable().optional(),
      status: z.enum(["active", "pending", "suspended", "terminated", "cancelled"]).nullable().optional(),
      password: z.string().nullable().optional(),
      vps_instance_id: z.string().nullable().optional(),
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Buscar serviço atual
    const { data: currentService, error: curErr } = await supabaseAdmin
      .from("services")
      .select("id, user_id, product_id, domain")
      .eq("id", input.serviceId)
      .single();

    if (curErr || !currentService) throw new Error("Serviço não encontrado.");

    const updatePayload: any = {};
    if (input.username !== undefined) updatePayload.username = input.username;
    if (input.domain !== undefined) updatePayload.domain = input.domain;
    if (input.server_id !== undefined) updatePayload.server_id = input.server_id;
    if (input.product_id !== undefined) updatePayload.product_id = input.product_id;
    if (input.next_due_date !== undefined) updatePayload.next_due_date = input.next_due_date;
    if (input.status !== undefined && input.status !== null) updatePayload.status = input.status;
    if (input.password !== undefined) updatePayload.password = input.password;

    const { error } = await supabaseAdmin
      .from("services")
      .update(updatePayload)
      .eq("id", input.serviceId);
      
    if (error) throw new Error(`Erro ao atualizar serviço: ${error.message}`);

    // Se houver vinculação de VPS, atualizar o proprietário e os dados técnicos
    if (input.vps_instance_id && input.vps_instance_id !== 'none') {
      const { data: vps } = await supabaseAdmin
        .from("vps_instances")
        .select("id, name, ip_address, region, os_template, external_id")
        .eq("id", input.vps_instance_id)
        .maybeSingle();

      if (vps) {
        // Atribuir o dono da VPS ao cliente do serviço
        await supabaseAdmin
          .from("vps_instances")
          .update({ user_id: currentService.user_id, status: 'active' })
          .eq("id", vps.id);

        // Atualizar hostname e região no serviço
        await supabaseAdmin
          .from("services")
          .update({
            domain: input.domain || vps.name || vps.ip_address || currentService.domain,
            vps_hostname: vps.name || null,
            vps_region: vps.region || null,
            vps_os_template: vps.os_template || null,
          })
          .eq("id", input.serviceId);
      }
    }

    // Se o serviço foi ativado manualmente agora, disparar provisionamento
    if (input.status === "active") {
      try {
        const { processProvisioning } = await import("../finance.server");
        
        // Buscar a fatura pendente ou paga associada a este serviço para provisionar
        const { data: invoiceItem } = await supabaseAdmin
          .from("invoice_items")
          .select("invoice_id")
          .eq("service_id", input.serviceId)
          .limit(1)
          .maybeSingle();
        
        if (invoiceItem?.invoice_id) {
          console.log(`[Admin] Disparando provisionamento manual para fatura ${invoiceItem.invoice_id} após ativação do serviço ${input.serviceId}`);
          await processProvisioning(invoiceItem.invoice_id);
        }
      } catch (e) {
        console.error("[Admin] Erro ao disparar provisionamento automático após ativação manual:", e);
      }
    }

    return { success: true };
  });


export const adminCreateClientService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        clientId: z.string().uuid(),
        productId: z.string().uuid(),
        billingCycle: z.enum(["monthly", "quarterly", "semiannually", "annually", "biennially"]).default("monthly"),
        status: z.enum(["active", "pending", "suspended", "cancelled"]).default("active"),
        nextDueDate: z.string().optional().nullable(),
        generateInvoice: z.boolean().default(false),
        notes: z.string().optional().nullable(),
        // Hosting specific fields
        domain: z.string().optional().nullable(),
        serverId: z.string().uuid().optional().nullable(),
        username: z.string().optional().nullable(),
        password: z.string().optional().nullable(),
        provisionServer: z.boolean().default(false),
        // VPS specific fields
        vpsHostname: z.string().optional().nullable(),
        vpsInstanceId: z.string().optional().nullable(),
        vpsIpAddress: z.string().optional().nullable(),
        vpsExternalId: z.string().optional().nullable(),
        vpsOsTemplate: z.string().optional().nullable(),
        vpsRegion: z.string().optional().nullable(),
        vpsSshUser: z.string().optional().nullable(),
        vpsSshPort: z.number().optional().nullable(),
        vpsSshPassword: z.string().optional().nullable(),
      })
      .parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verificar se é admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");

    // Buscar produto
    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("*, product_prices(*)")
      .eq("id", input.productId)
      .single();

    if (pErr || !product) throw new Error("Produto não encontrado.");

    // Buscar perfil do cliente
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", input.clientId)
      .single();

    if (profErr || !profile) throw new Error("Cliente não encontrado.");

    let finalPassword = input.password || input.vpsSshPassword || "";
    let directAdminCreated = false;

    // 1. Provisionamento opcional no DirectAdmin se for hospedagem
    if (product.product_type === 'hosting' && input.provisionServer && input.serverId && input.username && input.domain) {
      try {
        const { createDAAccount } = await import("../directadmin.server");
        const daRes = await createDAAccount(input.serverId, {
          username: input.username,
          email: profile.email || "contato@eqsam.com",
          domain: input.domain,
          package: product.directadmin_package || "Default",
          password: input.password || undefined,
        });
        if (daRes?.daPassword) {
          finalPassword = daRes.daPassword;
        }
        directAdminCreated = true;
      } catch (daErr: any) {
        console.warn("[AdminAddService] Aviso no DirectAdmin:", daErr.message);
        throw new Error(`Falha ao criar conta no DirectAdmin: ${daErr.message}`);
      }
    }

    // 2. Criar serviço no banco de dados
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    const nextDue = input.nextDueDate || defaultDueDate.toISOString();

    const domainName = product.product_type === 'vps'
      ? (input.vpsHostname || input.domain || `vps-${profile.email?.split('@')[0] || 'instancia'}`)
      : (input.domain || "sem-dominio.com");

    const usernameVal = product.product_type === 'vps'
      ? (input.vpsSshUser || 'root')
      : (input.username || null);

    const { data: service, error: sErr } = await supabaseAdmin
      .from("services")
      .insert({
        user_id: input.clientId,
        product_id: input.productId,
        server_id: product.product_type === 'hosting' ? (input.serverId || null) : null,
        domain: domainName,
        username: usernameVal,
        password: finalPassword || null,
        billing_cycle: input.billingCycle,
        status: input.status,
        next_due_date: nextDue,
        vps_hostname: product.product_type === 'vps' ? (input.vpsHostname || domainName) : null,
        vps_os_template: product.product_type === 'vps' ? (input.vpsOsTemplate || 'Ubuntu') : null,
        vps_region: product.product_type === 'vps' ? (input.vpsRegion || 'US-east') : null,
        notes: input.notes || (directAdminCreated ? "Hospedagem provisionada automaticamente no DirectAdmin." : product.product_type === 'vps' ? "Instância VPS vinculada/criada pelo administrador." : "Criado manualmente pelo administrador."),
      })
      .select()
      .single();

    if (sErr || !service) throw new Error(`Erro ao cadastrar serviço: ${sErr?.message}`);

    // 3. Se for produto VPS, gerenciar/vincular a linha na tabela vps_instances
    if (product.product_type === 'vps') {
      const vpsPayload: any = {
        user_id: input.clientId,
        external_id: input.vpsExternalId || input.vpsHostname || String(Date.now()),
        name: input.vpsHostname || product.name || 'Servidor VPS',
        ip_address: input.vpsIpAddress || null,
        region: input.vpsRegion || 'US-east',
        os_template: input.vpsOsTemplate || 'Ubuntu',
        status: input.status === 'active' ? 'active' : 'pending',
      };

      if (input.vpsInstanceId && input.vpsInstanceId !== 'new') {
        await supabaseAdmin
          .from('vps_instances')
          .update(vpsPayload)
          .eq('id', input.vpsInstanceId);
      } else {
        await supabaseAdmin
          .from('vps_instances')
          .insert(vpsPayload);
      }
    }

    // 4. Gerar fatura opcional
    if (input.generateInvoice) {
      try {
        const prices = product.product_prices || [];
        const matchedPriceObj = prices.find((p: any) => p.cycle === input.billingCycle && p.is_active !== false);
        const price = Number(matchedPriceObj?.price || 19.90);

        const { data: invoice } = await supabaseAdmin
          .from("invoices")
          .insert({
            user_id: input.clientId,
            total_amount: price,
            subtotal: price,
            discount_amount: 0,
            due_date: nextDue,
            status: input.status === "active" ? "paid" : "pending",
            payment_method: "manual",
            notes: `Fatura gerada manualmente para ${product.name} (${domainName})`,
          })
          .select()
          .single();

        if (invoice) {
          await supabaseAdmin.from("invoice_items").insert({
            invoice_id: invoice.id,
            service_id: service.id,
            description: `${product.name} - ${domainName} (${input.billingCycle.toUpperCase()})`,
            amount: price,
            quantity: 1,
          });
        }
      } catch (invErr: any) {
        console.warn("[AdminAddService] Aviso ao gerar fatura:", invErr.message);
      }
    }

    return { success: true, serviceId: service.id };
  });

