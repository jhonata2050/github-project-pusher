import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { processProvisioning } from '@/lib/finance.server';

export const Route = createFileRoute('/api/public/webhooks/paghiper')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData();
        const notificationId = formData.get('notification_id');
        const transactionId = formData.get('transaction_id') as string;
        const status = formData.get('status');

        if (status === 'paid' || status === 'completed') {
           const { data: transaction } = await supabaseAdmin
            .from('transactions')
            .select('*, invoices(*)')
            .eq('gateway_reference', transactionId)
            .single();

          if (transaction && transaction.status !== 'completed') {
            await supabaseAdmin.from('transactions').update({ status: 'completed' }).eq('id', transaction.id);
            const { data: invoice } = await supabaseAdmin
              .from('invoices')
              .update({ status: 'paid', paid_at: new Date().toISOString() })
              .eq('id', transaction.invoice_id!)
              .select().single();
            
            if (invoice) await processProvisioning(invoice.id);
          }
        }
        
        return new Response('HTTP 200 OK');
      }
    }
  }
});
