import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { handlePaymentSuccess } from '@/lib/finance.server';

export const Route = createFileRoute('/api/public/webhooks/cajupay')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        try {
          const payload = JSON.parse(body);

          if (payload.status === 'PAID' || payload.event === 'payment.paid') {
            const externalId = payload.id || payload.external_id;
            
            const { data: transaction } = await supabaseAdmin
              .from('transactions')
              .select('id, invoice_id, status')
              .eq('gateway_reference', externalId)
              .maybeSingle();

            if (transaction && transaction.status !== 'completed' && transaction.invoice_id) {
              await handlePaymentSuccess(transaction.invoice_id, 'CajuPay', externalId);
            }
          }
          
          return new Response('ok', { status: 200 });
        } catch (err: any) {
          console.error('[CajuPay Webhook] Erro:', err.message);
          return new Response('ok', { status: 200 });
        }
      }
    }
  }
});
