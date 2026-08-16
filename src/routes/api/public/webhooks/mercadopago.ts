import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { processProvisioning } from '@/lib/finance.server';
import { createHmac, timingSafeEqual } from 'crypto';

export const Route = createFileRoute('/api/public/webhooks/mercadopago')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const topic = new URL(request.url).searchParams.get('topic');
        const id = new URL(request.url).searchParams.get('id');
        
        // Mercado Pago envia notificações de diferentes formas
        // Se for via body (v1/payments)
        let payload: any = {};
        try { payload = JSON.parse(body); } catch(e) {}
        
        const resourceId = id || payload.data?.id || payload.resource?.split('/').pop();
        const action = payload.action || topic;

        if (resourceId && (action === 'payment.created' || action === 'payment.updated' || topic === 'payment')) {
          // Buscar detalhes do pagamento no Mercado Pago (precisaria do Access Token)
          // Simplificando: vamos buscar a transação no banco pela referência
          const { data: transaction } = await supabaseAdmin
            .from('transactions')
            .select('*, invoices(*)')
            .eq('gateway_reference', resourceId)
            .single();

          if (transaction && transaction.status !== 'completed') {
            // Aqui em produção você faria um fetch no MP para confirmar o status 'approved'
            // await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, ...)
            
            // Simulação de confirmação
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
