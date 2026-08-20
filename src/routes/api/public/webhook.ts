import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export const Route = createFileRoute('/api/public/webhook')({
  server: {
    handlers: {
      GET: async () => {
        // Endpoint para verificação de saúde/registro de alguns gateways
        return new Response('Webhook endpoint is active. Use POST for notifications.', { status: 200 });
      },
      POST: async ({ request }) => {
        let body = '';
        const headers = Object.fromEntries(request.headers.entries());
        
        try {
          body = await request.text();
          console.log('[Generic Webhook] Payload recebido:', body);
          
          let payload: any = {};
          try {
            payload = JSON.parse(body);
          } catch (e) {
            console.warn('[Generic Webhook] Erro ao parsear JSON:', e);
          }

          // Log de auditoria inicial (antes de qualquer processamento que possa falhar)
          await supabaseAdmin.from('audit_logs').insert({
            category: 'webhook',
            action: 'generic_webhook.received',
            status: 'info',
            description: 'Notificação recebida no endpoint genérico',
            metadata: { body: payload, headers, raw: body } as any
          });

          // 0. Tratamento de Eventos de Teste (Padrão para vários gateways)
          const isTestEvent = 
            payload.evento === 'teste_webhook' || 
            payload.event === 'teste_webhook' ||
            payload.type === 'test_notification' ||
            payload.action === 'test';

          if (isTestEvent) {
            console.log('[Generic Webhook] Evento de teste detectado e aceito.');
            return new Response('OK', { status: 200 });
          }

          // 1. Detecção e Processamento OpenPix/Woovi
          const isWoovi = payload.event?.startsWith('OPENPIX:') || 
                          headers['x-openpix-signature'];

          if (isWoovi) {
            const chargeId = payload.charge?.correlationID || payload.charge?.identifier || payload.correlationID || payload.identifier;
            
            if (chargeId && payload.event === 'OPENPIX:CHARGE_COMPLETED') {
              const { handlePaymentSuccess } = await import('@/lib/finance.server');
              
              // 1. Tentar localizar a transação pelo ID do gateway
              let { data: transaction } = await supabaseAdmin
                .from('transactions')
                .select('id, invoice_id, status')
                .eq('gateway_reference', chargeId)
                .maybeSingle();

              // 2. Se não encontrou transação, tenta extrair o invoiceId do correlationID (padrão invoice-UUID)
              let invoiceId = transaction?.invoice_id;
              if (!invoiceId && typeof chargeId === 'string' && chargeId.startsWith('invoice-')) {
                invoiceId = chargeId.replace('invoice-', '');
                console.log(`[Generic Webhook] Localizando fatura via correlationID: ${invoiceId}`);
              }

              if (invoiceId) {
                if (!transaction || transaction.status !== 'completed') {
                  await handlePaymentSuccess(invoiceId, 'Woovi/OpenPix', chargeId);
                } else {
                  console.log(`[Generic Webhook] Pagamento já processado para fatura ${invoiceId}.`);
                }
              } else {
                console.warn(`[Generic Webhook] Não foi possível determinar a fatura para a referência: ${chargeId}`);
                await supabaseAdmin.from('audit_logs').insert({
                  category: 'webhook',
                  action: 'generic_webhook.missing_data',
                  status: 'warning',
                  description: `Falha ao localizar fatura para referência Woovi: ${chargeId}`,
                  metadata: { chargeId, payload } as any
                });
              }
            }
          }

          // 2. Detecção e Processamento Mercado Pago
          const isMercadoPago = headers['x-signature'] || new URL(request.url).searchParams.has('topic') || payload.resource?.includes('mercadopago');
          if (isMercadoPago && !isWoovi) {
            const topic = new URL(request.url).searchParams.get('topic');
            const resourceId = new URL(request.url).searchParams.get('id') || payload.data?.id;
            const action = payload.action || topic;
            
            if (resourceId && (action === 'payment.created' || action === 'payment.updated' || topic === 'payment')) {
              const { handlePaymentSuccess } = await import('@/lib/finance.server');
              const { data: transaction } = await supabaseAdmin
                .from('transactions')
                .select('id, invoice_id, status')
                .eq('gateway_reference', resourceId.toString())
                .maybeSingle();

              if (transaction && transaction.status !== 'completed' && transaction.invoice_id) {
                await handlePaymentSuccess(transaction.invoice_id, 'Mercado Pago', resourceId.toString());
              }
            }
          }

          // 3. Outros Gateways (Stripe, AbacatePay, etc. podem ser adicionados aqui se necessário)

          // Sempre retornar 200 para o gateway após registrar o recebimento
          return new Response('OK', { status: 200 });
        } catch (err: any) {
          console.error('[Generic Webhook] Erro crítico:', err.message);
          // Mesmo em erro crítico, tentamos logar a falha
          try {
            await supabaseAdmin.from('audit_logs').insert({
              category: 'webhook',
              action: 'generic_webhook.error',
              status: 'failure',
              description: `Erro crítico no processamento: ${err.message}`,
              metadata: { error: err.message, body, headers } as any
            });
          } catch (e) {}
          
          // Retornamos 200 para evitar retentativas infinitas do gateway se já logamos o erro
          return new Response('OK', { status: 200 });
        }
      }
    }
  }
});
