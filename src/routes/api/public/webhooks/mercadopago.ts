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

          const webhookSecret = (setting?.value as string) || process.env['MERCADOPAGO_WEBHOOK_SECRET'] || '';

          // Fail-closed: segredo obrigatório
          if (!webhookSecret) {
            console.error('[Mercado Pago Webhook] Segredo mercadopago_webhook_secret não configurado');
            await supabaseAdmin.from('audit_logs').insert({
              entity_type: 'webhook',
              action: 'mercadopago.unconfigured',
              description: 'Webhook do Mercado Pago rejeitado: segredo não configurado no sistema',
              metadata: { category: 'webhook', status: 'failure' } as any,
            });
            return new Response('Webhook not configured', { status: 401 });
          }

          // Fail-closed: assinatura obrigatória
          if (!xSignature) {
            console.error('[Mercado Pago Webhook] Cabeçalho x-signature ausente');
            await supabaseAdmin.from('audit_logs').insert({
              entity_type: 'webhook',
              action: 'mercadopago.missing_signature',
              description: 'Webhook do Mercado Pago rejeitado: cabeçalho x-signature ausente',
              metadata: { category: 'webhook', status: 'failure' } as any,
            });
            return new Response('Signature missing', { status: 401 });
          }

          // Validar assinatura do Mercado Pago (padrão v2)
          let signatureValid = false;
          try {
            const parts = xSignature.split(',');
            const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
            const hash = parts.find(p => p.startsWith('v1='))?.split('=')[1];

            if (ts && hash) {
              const url = new URL(request.url);
              const resourceId = url.searchParams.get('id');
              const manifest = `id:${resourceId};request-id:${request.headers.get('x-request-id') || ''};ts:${ts};`;
              const expected = createHmac('sha256', webhookSecret).update(manifest).digest('hex');

              if (hash.length === expected.length && timingSafeEqual(Buffer.from(hash), Buffer.from(expected))) {
                signatureValid = true;
              }
            }
          } catch (e) {
            console.warn('[Mercado Pago Webhook] Erro ao validar assinatura:', e);
          }

          if (!signatureValid) {
            console.error('[Mercado Pago Webhook] Assinatura inválida');
            await supabaseAdmin.from('audit_logs').insert({
              entity_type: 'webhook',
              action: 'mercadopago.invalid_signature',
              description: 'Webhook do Mercado Pago rejeitado: assinatura criptográfica inválida',
              metadata: { category: 'webhook', status: 'failure' } as any,
            });
            return new Response('Invalid signature', { status: 401 });
          }

          const topic = new URL(request.url).searchParams.get('topic');
          const id = new URL(request.url).searchParams.get('id');
          
          let payload: any = {};
          try { payload = JSON.parse(body); } catch(e) {}
          
          const resourceId = id || payload.data?.id || payload.resource?.split('/').pop();
          const action = payload.action || topic;

          // Validação robusta de status direto na API do Mercado Pago
          let isApproved = false;
          let paymentStatus = '';

          const { data: tokenSetting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'mercadopago_access_token')
            .maybeSingle();

          const accessToken = (tokenSetting?.value as string) || process.env['MERCADOPAGO_ACCESS_TOKEN'] || '';

          if (resourceId && accessToken) {
            try {
              const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              });
              if (mpRes.ok) {
                const paymentDetails = await mpRes.json();
                paymentStatus = paymentDetails?.status || '';
                if (paymentStatus === 'approved') {
                  isApproved = true;
                }
              } else {
                console.warn(`[Mercado Pago Webhook] Falha ao consultar pagamento ${resourceId}: ${mpRes.status}`);
              }
            } catch (fetchErr: any) {
              console.error(`[Mercado Pago Webhook] Erro de rede ao consultar pagamento:`, fetchErr.message);
            }
          }

          if (resourceId && isApproved) {
            const { data: transaction } = await supabaseAdmin
              .from('transactions')
              .select('id, invoice_id, status')
              .eq('gateway_reference', resourceId.toString())
              .maybeSingle();

            if (transaction && transaction.status !== 'completed' && transaction.invoice_id) {
              await handlePaymentSuccess(transaction.invoice_id, 'Mercado Pago', resourceId.toString());
            }
          } else if (resourceId && (paymentStatus === 'rejected' || paymentStatus === 'cancelled')) {
            await supabaseAdmin
              .from('transactions')
              .update({ status: 'failed' })
              .eq('gateway_reference', resourceId.toString())
              .neq('status', 'completed');
          }
          
          return new Response('ok', { status: 200 });
        } catch (err: any) {
          console.error('[Mercado Pago Webhook] Erro:', err.message);
          await supabaseAdmin.from('audit_logs').insert({
            entity_type: 'webhook',
            action: 'mercadopago.error',
            description: `Erro no processamento Mercado Pago: ${err.message}`,
            metadata: { category: 'webhook', status: 'failure', error: err.message, body } as any
          });
          return new Response('ok', { status: 200 });
        }
      }
    }
  }
});
