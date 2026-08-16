import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { processProvisioning } from '@/lib/finance.server';

export const Route = createFileRoute('/api/public/webhooks/woovi')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const payload = JSON.parse(body);

        if (payload.event === 'OPENPIX:CHARGE_COMPLETED') {
          const chargeId = payload.charge.correlationID;
          
          const { data: transaction } = await supabaseAdmin
            .from('transactions')
            .select('*, invoices(*)')
            .eq('id', chargeId) // Woovi usamos correlationID como nosso ID de transação
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
