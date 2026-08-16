import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { processProvisioning } from '@/lib/finance.server';

export const Route = createFileRoute('/api/public/webhooks/stripe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const sig = request.headers.get('stripe-signature');
        
        try {
          const payload = JSON.parse(body);
          
          if (payload.type === 'checkout.session.completed') {
            const session = payload.data.object;
            const invoiceId = session.client_reference_id;
            
            const { data: invoice } = await supabaseAdmin
              .from('invoices')
              .update({ status: 'paid', paid_at: new Date().toISOString(), payment_method: 'credit_card' })
              .eq('id', invoiceId)
              .select().single();
              
            if (invoice) await processProvisioning(invoice.id);
          }
          
          return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
        } catch (err: any) {
          return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }
      }
    }
  }
});
