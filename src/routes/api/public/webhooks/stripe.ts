import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { handlePaymentSuccess } from '@/lib/finance.server';
import { verifyStripeSignature } from '@/lib/webhook-utils.server';

export const Route = createFileRoute('/api/public/webhooks/stripe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const sig = request.headers.get('stripe-signature');
        
        try {
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
          
          const payload = JSON.parse(body);
          
          if (payload.type === 'checkout.session.completed') {
            const session = payload.data.object;
            const invoiceId = session.client_reference_id;
            
            if (invoiceId) {
              await handlePaymentSuccess(invoiceId, 'Stripe');
            }
          }
          
          return new Response(JSON.stringify({ received: true }), { 
            headers: { 'Content-Type': 'application/json' },
            status: 200 
          });
        } catch (err: any) {
          console.error('[Stripe Webhook] Erro:', err.message);
          // Respondemos 200 para evitar retries infinitos se o erro for de processamento,
          // mas logamos o erro para auditoria.
          await supabaseAdmin.from('audit_logs').insert({
            category: 'webhook',
            action: 'stripe.error',
            status: 'failure',
            description: `Erro no processamento Stripe: ${err.message}`,
            metadata: { error: err.message, body } as any
          });
          return new Response('OK', { status: 200 });
        }
      }
    }
  }
});
