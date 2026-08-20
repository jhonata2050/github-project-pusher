import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { handlePaymentSuccess } from '@/lib/finance.server';

export const Route = createFileRoute('/api/public/webhooks/paghiper')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const transactionId = formData.get('transaction_id') as string;
          const status = formData.get('status');

          if (status === 'paid' || status === 'completed') {
             const { data: transaction } = await supabaseAdmin
              .from('transactions')
              .select('id, invoice_id, status')
              .eq('gateway_reference', transactionId)
              .maybeSingle();

            if (transaction && transaction.status !== 'completed' && transaction.invoice_id) {
              await handlePaymentSuccess(transaction.invoice_id, 'PagHiper', transactionId);
            }
          }
          
          return new Response('HTTP 200 OK', { status: 200 });
        } catch (err: any) {
          console.error('[PagHiper Webhook] Erro:', err.message);
          return new Response('HTTP 200 OK', { status: 200 });
        }
      }
    }
  }
});
