import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { processProvisioning } from '@/lib/finance.server';

export const Route = createFileRoute('/api/public/webhooks/cajupay')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const payload = JSON.parse(body);

        // Suposição baseada em padrões de webhooks
        if (payload.status === 'PAID' || payload.event === 'payment.paid') {
          const externalId = payload.id || payload.external_id;
          
          const { data: transaction } = await supabaseAdmin
            .from('transactions')
            .select('*, invoices(*)')
            .eq('gateway_reference', externalId)
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
        
        return new Response('ok');
      }
    }
  }
});
