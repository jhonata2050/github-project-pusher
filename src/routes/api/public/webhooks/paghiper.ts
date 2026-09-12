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
          const { data: settings } = await supabaseAdmin
            .from('system_settings')
            .select('key, value')
            .in('key', ['paghiper_api_key', 'paghiper_token', 'paghiper_webhook_secret']);

          const cfg: Record<string, string> = Object.fromEntries(
            (settings || []).map((s: any) => [s.key, typeof s.value === 'string' ? s.value : String(s.value ?? '')])
          );

          const systemApiKey = cfg['paghiper_api_key'] || process.env['PAGHIPER_API_KEY'] || '';
          const systemToken = cfg['paghiper_token'] || process.env['PAGHIPER_TOKEN'] || '';
          const webhookSecret = cfg['paghiper_webhook_secret'] || process.env['PAGHIPER_WEBHOOK_SECRET'] || '';

          const params = new URLSearchParams(body);
          const apiKey = params.get('apiKey');
          const notificationId = params.get('notification_id');
          const transactionId = params.get('transaction_id');

          // Autorização: apiKey igual à do sistema ou HMAC válido com segredo
          const authorized =
            (systemApiKey && apiKey === systemApiKey) ||
            (webhookSecret && verifyHmacSignature(body, signature, webhookSecret)) ||
            (systemToken && apiKey === systemToken);

          if (!authorized) {
            await supabaseAdmin.from('audit_logs').insert({
              entity_type: 'webhook',
              action: 'paghiper.invalid_signature',
              description: 'Webhook PagHiper rejeitado: credencial ou assinatura inválida',
              metadata: { category: 'webhook', status: 'failure' } as any,
            });
            return new Response('Invalid signature', { status: 401 });
          }

          let isPaid = false;
          const statusParam = params.get('status');
          if (statusParam === 'paid' || statusParam === 'completed') {
            isPaid = true;
          }

          // Se a notificação veio com notification_id oficial, consultar a API da PagHiper
          if (!isPaid && notificationId && transactionId && (systemToken || systemApiKey)) {
            const endpoints = [
              'https://pix.paghiper.com/invoice/notification/',
              'https://api.paghiper.com/transaction/notification/'
            ];

            for (const endpoint of endpoints) {
              try {
                const res = await fetch(endpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                  body: JSON.stringify({
                    token: systemToken,
                    apiKey: systemApiKey,
                    notification_id: notificationId,
                    transaction_id: transactionId,
                  }),
                });

                if (res.ok) {
                  const data: any = await res.json().catch(() => null);
                  const status =
                    data?.status_request?.status ||
                    data?.pix_status_request?.status ||
                    data?.transaction_status_request?.status;

                  if (status === 'paid' || status === 'completed') {
                    isPaid = true;
                    break;
                  }
                }
              } catch (checkErr: any) {
                console.warn(`[PagHiper Webhook] Erro ao consultar ${endpoint}:`, checkErr.message);
              }
            }
          }

          if (transactionId && isPaid) {
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
