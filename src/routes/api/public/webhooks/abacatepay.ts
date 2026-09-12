import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { handlePaymentSuccess } from '@/lib/finance.server';
import { verifyHmacSignature } from '@/lib/webhook-utils.server';

export const Route = createFileRoute('/api/public/webhooks/abacatepay')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get('x-abacatepay-signature');
        const body = await request.text();
        
        try {
          // 1. Obter segredo do webhook das configurações
          const { data: setting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'abacatepay_webhook_secret')
            .maybeSingle();

          const webhookSecret = (setting?.value as string) || process.env['ABACATEPAY_WEBHOOK_SECRET'] || '';

          // Fail-closed: segredo e assinatura obrigatórios
          if (!webhookSecret) {
            console.error('[AbacatePay Webhook] Segredo não configurado');
            return new Response('Webhook not configured', { status: 401 });
          }

          if (!signature || !verifyHmacSignature(body, signature, webhookSecret)) {
            console.error('[AbacatePay Webhook] Assinatura inválida ou ausente');
            return new Response('Invalid signature', { status: 401 });
          }
          
          const payload = JSON.parse(body);
          
          if (payload.event === 'billing.paid' || (payload.data && payload.data.status === 'PAID')) {
            const gatewayRef = payload.data?.id;
            
            if (gatewayRef) {
              const { data: transaction } = await supabaseAdmin
                .from('transactions')
                .select('id, invoice_id, status')
                .eq('gateway_reference', gatewayRef.toString())
                .maybeSingle();
                
              if (transaction && transaction.status !== 'completed' && transaction.invoice_id) {
                await handlePaymentSuccess(transaction.invoice_id, 'AbacatePay', gatewayRef.toString());
              }
            }
          }
          
          return new Response('ok', { status: 200 });
        } catch (err: any) {
          console.error('[AbacatePay Webhook] Erro:', err.message);
          await supabaseAdmin.from('audit_logs').insert({
            entity_type: 'webhook',
            action: 'abacatepay.error',
            description: `Erro no processamento AbacatePay: ${err.message}`,
            metadata: { category: 'webhook', status: 'failure', error: err.message, body } as any
          });
          return new Response('ok', { status: 200 });
        }
      }
    }
  }
});
