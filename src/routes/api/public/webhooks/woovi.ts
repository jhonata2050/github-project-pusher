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

          const webhookSecret = setting?.value as string;

          if (webhookSecret && !verifyHmacSignature(body, signature, webhookSecret)) {
            console.error('[Woovi Webhook] Assinatura inválida');
            return new Response('Invalid signature', { status: 401 });
          }

          const payload = JSON.parse(body);

          // Payload de teste ou evento específico da OpenPix
          // Payload de teste ou evento específico da OpenPix
          if (payload.event?.startsWith('OPENPIX:') || payload.event === 'teste_webhook' || payload.evento === 'teste_webhook') {
            // Se for apenas teste sem charge, retornamos OK
            if (!payload.charge && (payload.event === 'teste_webhook' || payload.evento === 'teste_webhook')) {
              console.log('[Woovi Webhook] Evento de teste ignorado com sucesso.');
              return new Response('ok', { status: 200 });
            }

            const chargeId = payload.charge?.correlationID || payload.charge?.identifier;
            
            if (chargeId) {
              const { data: transaction } = await supabaseAdmin
                .from('transactions')
                .select('id, invoice_id, status')
                .eq('gateway_reference', chargeId)
                .maybeSingle();

              if (transaction && transaction.status !== 'completed' && transaction.invoice_id) {
                await handlePaymentSuccess(transaction.invoice_id, 'Woovi/OpenPix', chargeId);
              }
            }
          }
          
          return new Response('ok', { status: 200 });
        } catch (err: any) {
          console.error('[Woovi Webhook] Erro:', err.message);
          await supabaseAdmin.from('audit_logs').insert({
            category: 'webhook',
            action: 'woovi.error',
            status: 'failure',
            description: `Erro no processamento Woovi: ${err.message}`,
            metadata: { error: err.message, body } as any
          });
          return new Response('ok', { status: 200 });
        }
      }
    }
  }
});
