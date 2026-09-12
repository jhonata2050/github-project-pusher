import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { handlePaymentSuccess } from '@/lib/finance.server';
import { verifyHmacSignature } from '@/lib/webhook-utils.server';

export const Route = createFileRoute('/api/public/webhooks/woovi')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get('x-openpix-signature');
        
        try {
          const { data: setting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'woovi_webhook_secret')
            .maybeSingle();

          const webhookSecret = (setting?.value as string) || process.env['WOOVI_WEBHOOK_SECRET'] || '';

          if (!webhookSecret) {
            console.error('[Woovi Webhook] Segredo woovi_webhook_secret não configurado');
            return new Response('Webhook not configured', { status: 401 });
          }

          if (!signature || !verifyHmacSignature(body, signature, webhookSecret)) {
            console.error('[Woovi Webhook] Assinatura inválida ou ausente');
            await supabaseAdmin.from('audit_logs').insert({
              entity_type: 'webhook',
              action: 'woovi.invalid_signature',
              description: 'Tentativa de webhook com assinatura HMAC inválida ou ausente',
              metadata: { category: 'webhook', status: 'failure', headers: request.headers } as any
            });
            return new Response('Invalid signature', { status: 401 });
          }

          const payload = JSON.parse(body);

          const isTestEvent = payload.event === 'teste_webhook' || payload.evento === 'teste_webhook';
          if (isTestEvent && !payload.charge) {
            console.log('[Woovi Webhook] Evento de teste ignorado com sucesso.');
            return new Response('ok', { status: 200 });
          }

          const isPaymentCompleted = payload.event === 'OPENPIX:CHARGE_COMPLETED' || payload.event === 'OPENPIX:TRANSACTION_RECEIVED';
          const chargeId = payload.charge?.correlationID || payload.charge?.identifier;
          
          if (chargeId && isPaymentCompleted) {
            const { data: transaction } = await supabaseAdmin
              .from('transactions')
              .select('id, invoice_id, status')
              .eq('gateway_reference', chargeId)
              .maybeSingle();

            if (transaction && transaction.status !== 'completed' && transaction.invoice_id) {
              await handlePaymentSuccess(transaction.invoice_id, 'Woovi/OpenPix', chargeId);
            }
          }
          
          return new Response('ok', { status: 200 });
        } catch (err: any) {
          console.error('[Woovi Webhook] Erro:', err.message);
          await supabaseAdmin.from('audit_logs').insert({
            entity_type: 'webhook',
            action: 'woovi.error',
            description: `Erro no processamento Woovi: ${err.message}`,
            metadata: { category: 'webhook', status: 'failure', error: err.message, body } as any
          });
          return new Response('ok', { status: 200 });
        }
      }
    }
  }
});
