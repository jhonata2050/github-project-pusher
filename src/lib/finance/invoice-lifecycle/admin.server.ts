import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { processProvisioning } from "../provisioning.server";
import type {
  AdminUpdateInvoiceParams,
  AdminCreateManualInvoiceParams,
} from "./types";

export async function adminUpdateInvoiceImplementation(
  invoiceData: AdminUpdateInvoiceParams,
  context: { supabase: any; userId: string }
) {
  // Verificar se o usuário autenticado é admin
  const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw new Error("Acesso negado. Apenas administradores podem gerenciar faturas.");
  }

  // Buscar estado atual da fatura
  const { data: currentInvoice, error: fetchErr } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("id", invoiceData.id)
    .single();

  if (fetchErr || !currentInvoice) {
    console.error(`[AdminFinance] Erro ao buscar fatura #${invoiceData.id}:`, fetchErr);
    throw new Error(`Fatura #${invoiceData.id} não encontrada: ${fetchErr?.message || "Registro inexistente"}`);
  }

  const updates: any = {
    updated_at: new Date().toISOString(),
  };

  if (invoiceData.status !== undefined) updates.status = invoiceData.status;
  if (invoiceData.due_date !== undefined) updates.due_date = invoiceData.due_date;
  if (invoiceData.total_amount !== undefined) updates.total_amount = Number(invoiceData.total_amount);
  if (invoiceData.subtotal !== undefined) updates.subtotal = Number(invoiceData.subtotal);
  if (invoiceData.discount_amount !== undefined) updates.discount_amount = Number(invoiceData.discount_amount);
  if (invoiceData.payment_method !== undefined) updates.payment_method = invoiceData.payment_method;
  if (invoiceData.paid_at !== undefined) updates.paid_at = invoiceData.paid_at;
  if (invoiceData.notes !== undefined) updates.notes = invoiceData.notes;

  const isMarkingPaid = updates.status === "paid" && currentInvoice.status !== "paid";
  if (isMarkingPaid && !updates.paid_at) {
    updates.paid_at = new Date().toISOString();
  }
  if (isMarkingPaid && !updates.payment_method) {
    updates.payment_method = "manual_admin";
  }

  const { data: updatedInvoice, error: updateErr } = await supabaseAdmin
    .from("invoices")
    .update(updates)
    .eq("id", invoiceData.id)
    .select()
    .single();

  if (updateErr) {
    console.error(`[AdminFinance] Erro ao atualizar fatura #${invoiceData.id}:`, updateErr);
    throw new Error(`Erro ao atualizar fatura: ${updateErr.message}`);
  }

  let provisioningTriggered = false;
  if (isMarkingPaid) {
    try {
      console.log(`[AdminFinance] Disparando processProvisioning para fatura #${invoiceData.id} após baixa manual.`);
      await processProvisioning(invoiceData.id);
      provisioningTriggered = true;
    } catch (provErr: any) {
      console.error(`[AdminFinance] Erro no provisionamento após baixa manual da fatura #${invoiceData.id}:`, provErr);
    }
  }

  // Registrar auditoria
  try {
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "invoice.admin_updated",
      entity_type: "invoice",
      entity_id: invoiceData.id,
      description: `Fatura #${invoiceData.id} atualizada pelo admin.${isMarkingPaid ? " (Baixa efetuada)" : ""}`,
      metadata: {
        invoiceId: invoiceData.id,
        previous: {
          status: currentInvoice.status,
          due_date: currentInvoice.due_date,
          total_amount: currentInvoice.total_amount,
          notes: currentInvoice.notes,
        },
        updates,
        provisioningTriggered,
      } as any,
    });
  } catch (logErr) {
    console.warn("[AdminFinance] Falha ao registrar log de auditoria:", logErr);
  }

  return {
    success: true,
    invoice: updatedInvoice,
    provisioningTriggered,
  };
}

export async function adminCreateManualInvoiceImplementation(
  invoiceData: AdminCreateManualInvoiceParams,
  context: { supabase: any; userId: string }
) {
  // Verificar se o usuário autenticado é admin
  const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw new Error("Acesso negado. Apenas administradores podem gerar faturas manuais.");
  }

  const isPaid = invoiceData.status === "paid";
  const now = new Date().toISOString();

  // 1. Criar fatura
  const { data: invoice, error: iErr } = await supabaseAdmin
    .from("invoices")
    .insert({
      user_id: invoiceData.userId,
      total_amount: Number(invoiceData.amount),
      subtotal: Number(invoiceData.amount),
      tax_amount: 0,
      discount_amount: 0,
      status: (invoiceData.status || "pending") as any,
      due_date: invoiceData.dueDate,
      paid_at: isPaid ? now : null,
      payment_method: isPaid ? (invoiceData.paymentMethod || "manual_admin") : null,
      notes: invoiceData.notes || null,
    })
    .select()
    .single();

  if (iErr || !invoice) {
    console.error("[AdminFinance] Erro ao criar fatura avulsa:", iErr);
    throw new Error(`Erro ao gerar fatura: ${iErr?.message}`);
  }

  // 2. Criar item da fatura
  const { error: itemErr } = await supabaseAdmin
    .from("invoice_items")
    .insert({
      invoice_id: invoice.id,
      description: invoiceData.description || "Serviço Avulso",
      amount: Number(invoiceData.amount),
      quantity: 1,
      service_id: invoiceData.serviceId || null,
    });

  if (itemErr) {
    console.warn("[AdminFinance] Aviso: Não foi possível registrar item da fatura:", itemErr.message);
  }

  // 3. Se foi criada como paga e vinculada a serviço, provisionar
  let provisioningTriggered = false;
  if (isPaid && invoiceData.serviceId) {
    try {
      await processProvisioning(invoice.id);
      provisioningTriggered = true;
    } catch (provErr: any) {
      console.error(`[AdminFinance] Erro ao provisionar fatura criada já paga #${invoice.id}:`, provErr);
    }
  }

  // 4. Log de auditoria
  try {
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "invoice.admin_created",
      entity_type: "invoice",
      entity_id: invoice.id,
      description: `Fatura manual #${invoice.id} gerada para o cliente no valor de R$ ${Number(invoiceData.amount).toFixed(2)}`,
      metadata: {
        invoiceId: invoice.id,
        userId: invoiceData.userId,
        amount: invoiceData.amount,
        serviceId: invoiceData.serviceId,
        status: invoice.status,
      } as any,
    });
  } catch (logErr) {
    console.warn("[AdminFinance] Falha ao registrar log de criação de fatura:", logErr);
  }

  return { success: true, invoice, provisioningTriggered };
}
