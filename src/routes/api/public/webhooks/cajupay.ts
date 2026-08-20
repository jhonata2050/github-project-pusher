import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { handlePaymentSuccess } from '@/lib/finance.server';
import { verifyHmacSignature } from '@/lib/webhook-utils.server';

export const Route = createFileRoute('/api/public/webhooks/cajupay')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature =
          request.headers.get('x-cajupay-signature') ||
          request.headers.get('x-signature') ||
          request.headers.get('x-webhook-signature');
        const tokenHeader = request.headers.get('x-webhook-token');

        try {
          const { data: setting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'cajupay_webhook_secret')
            .maybeSingle();

          const webhookSecret = (setting?.value as string) || '';

          // Fail closed: sem segredo configurado nenhum pagamento é confirmado
          const authorized =
            !!webhookSecret &&
            (verifyHmacSignature(body, signature, webhookSecret) || tokenHeader === webhookSecret);

          if (!authorized) {
            await supabaseAdmin.from('audit_logs').insert({
              category: 'webhook',
              action: 'cajupay.invalid_signature',
              status: 'failure',
              description: 'Webhook CajuPay rejeitado: assinatura ausente ou inválida',
              metadata: {} as any,
            });
            return new Response('Invalid signature', { status: 401 });
          }

          const payload = JSON.parse(body);

          if (payload.status === 'PAID' || payload.event === 'payment.paid' || payload.evento === 'pagamento.confirmado') {
            const externalId = payload.id || payload.external_id || payload.transacao_id;

            if (externalId) {
              const { data: transaction } = await supabaseAdmin
                .from('transactions')
                .select('id, invoice_id, status')
                .eq('gateway_reference', externalId.toString())
                .maybeSingle();

              if (transaction && transaction.status !== 'completed' && transaction.invoice_id) {
                await handlePaymentSuccess(transaction.invoice_id, 'CajuPay', externalId.toString());
              }
            }
          }

          return new Response('ok', { status: 200 });
        } catch (err: any) {
          console.error('[CajuPay Webhook] Erro:', err.message);
          return new Response('ok', { status: 200 });
        }
      }
    }
  }
});
