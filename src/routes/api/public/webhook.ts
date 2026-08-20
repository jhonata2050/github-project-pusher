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
        const body = await request.text();
        const headers = Object.fromEntries(request.headers.entries());
        
        try {
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

          // 1. Detecção e Processamento OpenPix/Woovi
          const isWoovi = payload.event?.startsWith('OPENPIX:') || 
                          payload.evento === 'teste_webhook' || 
                          headers['x-openpix-signature'];

          if (isWoovi) {
            // Se for apenas teste, ignoramos processamento de negócio
            if (payload.event === 'teste_webhook' || payload.evento === 'teste_webhook') {
              console.log('[Generic Webhook] Evento de teste Woovi ignorado.');
              return new Response('OK', { status: 200 });
            }

            const chargeId = payload.charge?.correlationID || payload.charge?.identifier;
            
            if (chargeId) {
              const { handlePaymentSuccess } = await import('@/lib/finance.server');
              const { data: transaction } = await supabaseAdmin
                .from('transactions')
                .select('id, invoice_id, status')
                .eq('gateway_reference', chargeId)
                .maybeSingle();

              if (transaction && transaction.status !== 'completed' && transaction.invoice_id) {
                await handlePaymentSuccess(transaction.invoice_id, 'Woovi/OpenPix', chargeId);
              }
            }
          }

          // 2. Detecção e Processamento Mercado Pago (se enviado para a URL genérica)
          const isMercadoPago = headers['x-signature'] || new URL(request.url).searchParams.has('topic');
          if (isMercadoPago && !isWoovi) {
            const topic = new URL(request.url).searchParams.get('topic');
            const resourceId = new URL(request.url).searchParams.get('id') || payload.data?.id;
            
            if (resourceId && (topic === 'payment' || payload.action?.startsWith('payment.'))) {
              const { handlePaymentSuccess } = await import('@/lib/finance.server');
              const { data: transaction } = await supabaseAdmin
                .from('transactions')
                .select('id, invoice_id, status')
                .eq('gateway_reference', resourceId)
                .maybeSingle();

              if (transaction && transaction.status !== 'completed' && transaction.invoice_id) {
                await handlePaymentSuccess(transaction.invoice_id, 'Mercado Pago', resourceId);
              }
            }
          }

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
              metadata: { error: err.message, body } as any
            });
          } catch (e) {}
          
          // Retornamos 200 para evitar retentativas infinitas do gateway se já logamos o erro
          return new Response('OK', { status: 200 });
        }
      }
    }
  }
});
