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
        try {
          const body = await request.text();
          const headers = Object.fromEntries(request.headers.entries());
          
          console.log('[Generic Webhook] Payload recebido:', body);
          
          let payload: any = {};
          try {
            payload = JSON.parse(body);
          } catch (e) {
            // Não é JSON, ignoramos processamento inteligente
          }

          // Detecção inteligente para OpenPix/Woovi (muitos configuram a URL genérica)
          if (payload.event === 'OPENPIX:CHARGE_COMPLETED' || payload.evento === 'teste_webhook') {
            const { handlePaymentSuccess } = await import('@/lib/finance.server');
            const chargeId = payload.charge?.correlationID || payload.charge?.identifier;
            
            if (chargeId) {
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
          
          await supabaseAdmin.from('audit_logs').insert({
            category: 'webhook',
            action: 'generic_webhook.received',
            status: 'info',
            description: 'Notificação recebida no endpoint genérico',
            metadata: { body: payload, headers } as any
          });

          return new Response('OK', { status: 200 });
        } catch (err: any) {
          console.error('[Generic Webhook] Erro:', err.message);
          return new Response('Internal Error', { status: 500 });
        }
      }
    }
  }
});
