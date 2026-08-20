import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { handlePaymentSuccess } from '@/lib/finance.server';
import { createHmac, timingSafeEqual } from 'crypto';

export const Route = createFileRoute('/api/public/webhooks/mercadopago')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const xSignature = request.headers.get('x-signature');
        
        try {
          // 1. Obter segredo do webhook
          const { data: setting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'mercadopago_webhook_secret')
            .maybeSingle();

          const webhookSecret = setting?.value as string;

          // 2. Validar assinatura do Mercado Pago (padrão v2)
          if (webhookSecret && xSignature) {
            try {
              const parts = xSignature.split(',');
              const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
              const hash = parts.find(p => p.startsWith('v1='))?.split('=')[1];
              
              if (ts && hash) {
                const url = new URL(request.url);
                const resourceId = url.searchParams.get('id');
                const manifest = `id:${resourceId};request-id:${request.headers.get('x-request-id') || ''};ts:${ts};`;
                const expected = createHmac('sha256', webhookSecret).update(manifest).digest('hex');
                
                if (!timingSafeEqual(Buffer.from(hash), Buffer.from(expected))) {
                  console.error('[Mercado Pago Webhook] Assinatura inválida');
                  return new Response('Invalid signature', { status: 401 });
                }
              }
            } catch (e) {
              console.warn('[Mercado Pago Webhook] Erro ao validar assinatura:', e);
            }
          }

          const topic = new URL(request.url).searchParams.get('topic');
          const id = new URL(request.url).searchParams.get('id');
          
          let payload: any = {};
          try { payload = JSON.parse(body); } catch(e) {}
          
          const resourceId = id || payload.data?.id || payload.resource?.split('/').pop();
          const action = payload.action || topic;

          // Validação robusta de IDs e ações
          if (resourceId && (action === 'payment.created' || action === 'payment.updated' || topic === 'payment')) {
            const { data: transaction } = await supabaseAdmin
              .from('transactions')
              .select('id, invoice_id, status')
              .eq('gateway_reference', resourceId.toString())
              .maybeSingle();

            if (transaction && transaction.status !== 'completed' && transaction.invoice_id) {
              await handlePaymentSuccess(transaction.invoice_id, 'Mercado Pago', resourceId.toString());
            }
          }
          
          return new Response('ok', { status: 200 });
        } catch (err: any) {
          console.error('[Mercado Pago Webhook] Erro:', err.message);
          await supabaseAdmin.from('audit_logs').insert({
            category: 'webhook',
            action: 'mercadopago.error',
            status: 'failure',
            description: `Erro no processamento Mercado Pago: ${err.message}`,
            metadata: { error: err.message, body } as any
          });
          return new Response('ok', { status: 200 });
        }
      }
    }
  }
});
