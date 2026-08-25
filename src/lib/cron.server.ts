import { supabaseAdmin } from '../integrations/supabase/client.server';
import { suspendDAAccount, deleteDAAccount } from './directadmin.server';
import { autoPayPendingInvoices } from './wallet.server';
import { sendWhatsAppMessage } from './whatsapp.server';

export interface CronExecutionResult {
  suspensions: number;
  deletions: number;
  remindersSent: number;
  invoicesGenerated: number;
  autoPaidInvoices: number;
  errors: string[];
}

/**
 * Executa a rotina diária de manutenção, faturamento recorrente e suspensão
 */
export async function executeDailyBillingCron(): Promise<CronExecutionResult> {
  const results: CronExecutionResult = {
    suspensions: 0,
    deletions: 0,
    remindersSent: 0,
    invoicesGenerated: 0,
    autoPaidInvoices: 0,
    errors: [],
  };

  console.log('[Billing Cron] Iniciando rotina diária de faturamento e manutenção...');

  try {
    // -------------------------------------------------------------------------
    // 1. GERAR FATURAS DE RENOVAÇÃO PARA SERVIÇOS A VENCER (7 dias de antecedência)
    // -------------------------------------------------------------------------
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: servicesToInvoice } = await supabaseAdmin
      .from('services')
      .select('*, products(*, product_prices(*)), profiles(id, full_name, phone, account_balance)')
      .eq('status', 'active')
      .lte('next_due_date', sevenDaysFromNow.toISOString());

    if (servicesToInvoice && servicesToInvoice.length > 0) {
      for (const service of servicesToInvoice as any[]) {
        try {
          // Verificar se já existe uma fatura pendente para este serviço
          const { data: existingPendingInvoice } = await supabaseAdmin
            .from('invoice_items')
            .select('invoice_id, invoices!inner(status, due_date)')
            .eq('service_id', service.id)
            .eq('invoices.status', 'pending')
            .maybeSingle();

          if (existingPendingInvoice) {
            // Já existe fatura gerada e pendente, não duplicar
            continue;
          }

          // Resolver preço com base no ciclo de faturamento
          const cycle = service.billing_cycle || 'monthly';
          const prices = service.products?.product_prices || [];
          const matchedPriceObj = prices.find((p: any) => p.cycle === cycle && p.is_active !== false);
          const price = Number(matchedPriceObj?.price || 19.90);

          // Criar Fatura de Renovação
          const { data: invoice, error: invError } = await supabaseAdmin
            .from('invoices')
            .insert({
              user_id: service.user_id,
              total_amount: price,
              subtotal: price,
              discount_amount: 0,
              due_date: service.next_due_date || new Date().toISOString(),
              status: 'pending',
              payment_method: 'pix',
              notes: `Renovação de Serviço: ${service.products?.name || 'Hospedagem'} (${service.domain || 'N/A'}) - Ciclo: ${cycle.toUpperCase()}`,
            })
            .select()
            .single();

          if (invError || !invoice) throw invError || new Error('Falha ao gerar fatura');

          // Item da fatura
          await supabaseAdmin.from('invoice_items').insert({
            invoice_id: invoice.id,
            service_id: service.id,
            description: `Renovação de Serviço: ${service.products?.name || 'Hospedagem'} (${service.domain || 'N/A'})`,
            amount: price,
            quantity: 1,
          });

          results.invoicesGenerated++;
          console.log(`[Billing Cron] Fatura #${invoice.id.slice(0, 8)} gerada para ${service.domain}`);

          // Notificar cliente no WhatsApp sobre a nova fatura gerada
          if (service.profiles?.phone) {
            try {
              await sendWhatsAppMessage({
                to: service.profiles.phone,
                message: `📄 *Fatura de Renovação Gerada!*\n\nOlá ${service.profiles.full_name},\nSua fatura para renovação do serviço *${service.domain || service.products?.name}* no valor de *R$ ${price.toFixed(2)}* foi gerada e vence em *${new Date(service.next_due_date).toLocaleDateString('pt-BR')}*.\n\nPague pelo painel ou utilize seu saldo em conta!`,
                category: 'invoice_created',
              });
              results.remindersSent++;
            } catch (wErr) {}
          }

          // Se o cliente tiver saldo suficiente na carteira, auto-liquidar na hora!
          const balance = Number(service.profiles?.account_balance || 0);
          if (balance >= price) {
            const payRes = await autoPayPendingInvoices(service.user_id);
            if (payRes.paidCount > 0) {
              results.autoPaidInvoices += payRes.paidCount;
            }
          }
        } catch (err: any) {
          results.errors.push(`Erro ao gerar fatura para serviço ${service.id} (${service.domain}): ${err.message}`);
        }
      }
    }

    // -------------------------------------------------------------------------
    // 2. AUTO-DÉBITO PARA CLIENTES COM SALDO EM CONTA
    // -------------------------------------------------------------------------
    const { data: clientsWithBalance } = await supabaseAdmin
      .from('profiles')
      .select('id, account_balance')
      .gt('account_balance', 0);

    if (clientsWithBalance) {
      for (const client of clientsWithBalance) {
        try {
          const autoRes = await autoPayPendingInvoices(client.id);
          if (autoRes.paidCount > 0) {
            results.autoPaidInvoices += autoRes.paidCount;
          }
        } catch (e) {}
      }
    }

    // -------------------------------------------------------------------------
    // 3. SUSPENSÃO AUTOMÁTICA POR ATRASO (Após 3 a 5 dias de vencimento)
    // -------------------------------------------------------------------------
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: overdueInvoices } = await supabaseAdmin
      .from('invoices')
      .select('*, invoice_items(service_id), profiles(full_name, phone)')
      .eq('status', 'pending')
      .lt('due_date', threeDaysAgo.toISOString());

    if (overdueInvoices) {
      for (const invoice of overdueInvoices as any[]) {
        for (const item of invoice.invoice_items || []) {
          if (item.service_id) {
            const { data: service } = await supabaseAdmin
              .from('services')
              .select('*, servers(*)')
              .eq('id', item.service_id)
              .maybeSingle();

            const s = service as any;
            if (s && s.status === 'active' && s.username && s.server_id) {
              try {
                // Suspender no DirectAdmin
                await suspendDAAccount(s.server_id, s.username);
                
                await supabaseAdmin
                  .from('services')
                  .update({
                    status: 'suspended',
                    suspension_reason: `Fatura #${invoice.id.slice(0, 8)} vencida há mais de 3 dias`,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', s.id);

                results.suspensions++;
                console.log(`[Billing Cron] Serviço ${s.domain} suspenso por inadimplência.`);

                if (invoice.profiles?.phone) {
                  try {
                    await sendWhatsAppMessage({
                      to: invoice.profiles.phone,
                      message: `⚠️ *Aviso de Suspensão de Serviço*\n\nOlá ${invoice.profiles.full_name},\nSeu serviço *${s.domain}* foi temporariamente suspenso devido à fatura *#${invoice.id.slice(0, 8)}* vencida.\n\nPara reativar instantaneamente seu serviço, efetue o pagamento no painel via Pix.`,
                      category: 'service_suspended',
                    });
                  } catch (wErr) {}
                }
              } catch (err: any) {
                results.errors.push(`Erro ao suspender ${s.domain}: ${err.message}`);
              }
            }
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // 4. CANCELAMENTO / TERMINAÇÃO APÓS 30 DIAS DE SUSPENSÃO
    // -------------------------------------------------------------------------
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: toDeleteServices } = await supabaseAdmin
      .from('services')
      .select('*, servers(*)')
      .eq('status', 'suspended')
      .lt('updated_at', thirtyDaysAgo.toISOString());

    if (toDeleteServices) {
      for (const s of toDeleteServices as any[]) {
        try {
          if (s.server_id && s.username) {
            await deleteDAAccount(s.server_id, s.username);
          }
          await supabaseAdmin
            .from('services')
            .update({ status: 'terminated', updated_at: new Date().toISOString() })
            .eq('id', s.id);

          results.deletions++;
          console.log(`[Billing Cron] Serviço ${s.domain} finalizado após 30 dias de suspensão.`);
        } catch (err: any) {
          results.errors.push(`Erro ao encerrar serviço ${s.domain}: ${err.message}`);
        }
      }
    }

    console.log('[Billing Cron] Rotina finalizada:', results);
    return results;
  } catch (globalErr: any) {
    console.error('[Billing Cron] Erro geral na rotina:', globalErr);
    results.errors.push(globalErr.message);
    return results;
  }
}
