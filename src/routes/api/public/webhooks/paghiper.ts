import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { handlePaymentSuccess } from '@/lib/finance.server';
import { verifyHmacSignature } from '@/lib/webhook-utils.server';

export const Route = createFileRoute('/api/public/webhooks/paghiper')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature =
          request.headers.get('x-paghiper-signature') ||
          request.headers.get('x-webhook-signature');

        try {
          const { data: setting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'paghiper_webhook_secret')
            .maybeSingle();

          const webhookSecret = (setting?.value as string) || '';

          const params = new URLSearchParams(body);
          const apiKey = params.get('apiKey');

          // Fail closed: exige assinatura HMAC válida ou apiKey correspondente ao segredo
          const authorized =
            !!webhookSecret &&
            (verifyHmacSignature(body, signature, webhookSecret) || apiKey === webhookSecret);

          if (!authorized) {
            await supabaseAdmin.from('audit_logs').insert({
              category: 'webhook',
              action: 'paghiper.invalid_signature',
              status: 'failure',
              description: 'Webhook PagHiper rejeitado: assinatura/apiKey ausente ou inválida',
              metadata: {} as any,
            });
            return new Response('Invalid signature', { status: 401 });
          }

          const transactionId = params.get('transaction_id');
          const status = params.get('status');

          if (transactionId && (status === 'paid' || status === 'completed')) {
            const { data: transaction } = await supabaseAdmin
              .from('transactions')
              .select('id, invoice_id, status')
              .eq('gateway_reference', transactionId.toString())
              .maybeSingle();

            if (transaction && transaction.status !== 'completed' && transaction.invoice_id) {
              await handlePaymentSuccess(transaction.invoice_id, 'PagHiper', transactionId.toString());
            }
          }

          return new Response('HTTP 200 OK', { status: 200 });
        } catch (err: any) {
          console.error('[PagHiper Webhook] Erro:', err.message);
          return new Response('HTTP 200 OK', { status: 200 });
        }
      }
    }
  }
});
