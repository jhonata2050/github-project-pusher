import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { processProvisioning } from '@/lib/finance.server';
import { verifyStripeSignature } from '@/lib/webhook-utils.server';

export const Route = createFileRoute('/api/public/webhooks/stripe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const sig = request.headers.get('stripe-signature');
        
        // 1. Obter segredo do webhook das configurações
        const { data: setting } = await supabaseAdmin
          .from('system_settings')
          .select('value')
          .eq('key', 'stripe_webhook_secret')
          .maybeSingle();

        const webhookSecret = setting?.value as string;

        // 2. Validar assinatura se o segredo estiver configurado
        if (webhookSecret && !verifyStripeSignature(body, sig, webhookSecret)) {
          console.error('[Stripe Webhook] Assinatura inválida');
          return new Response('Invalid signature', { status: 401 });
        }
        
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
          console.error('[Stripe Webhook] Erro:', err.message);
          return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }
      }
    }
  }
});
