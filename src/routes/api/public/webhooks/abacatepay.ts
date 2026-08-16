import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { processProvisioning } from '@/lib/finance.server';

export const Route = createFileRoute('/api/public/webhooks/abacatepay')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get('x-abacatepay-signature');
        const body = await request.text();
        
        // Em um cenário real, validaríamos a assinatura aqui
        // const isValid = verifySignature(body, signature, process.env['ABACATEPAY_WEBHOOK_SECRET']);
        
        try {
          const payload = JSON.parse(body);
          
          // O evento pode ser 'billing.paid'
          if (payload.event === 'billing.paid' || (payload.data && payload.data.status === 'PAID')) {
            const gatewayRef = payload.data.id;
            
            // 1. Localizar transação e fatura
            const { data: transaction } = await supabaseAdmin
              .from('transactions')
              .select('*, invoices(*)')
              .eq('gateway_reference', gatewayRef)
              .single();
              
            if (transaction && transaction.status !== 'completed') {
              // 2. Marcar transação como concluída
              await supabaseAdmin
                .from('transactions')
                .update({ status: 'completed' })
                .eq('id', transaction.id);
                
              // 3. Marcar fatura como paga
              const { data: invoice } = await supabaseAdmin
                .from('invoices')
                .update({ status: 'paid', paid_at: new Date().toISOString() })
                .eq('id', transaction.invoice_id!)
                .select()
                .single();
                
              if (invoice) {
                // 4. Iniciar provisionamento
                await processProvisioning(invoice.id);
              }
            }
          }
          
          return new Response('ok');
        } catch (err: any) {
          console.error('Webhook Error:', err);
          return new Response('error', { status: 500 });
        }
      }
    }
  }
});
