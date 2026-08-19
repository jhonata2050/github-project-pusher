import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { processProvisioning } from '@/lib/finance.server';
import { createHmac, timingSafeEqual } from 'crypto';

export const Route = createFileRoute('/api/public/webhooks/mercadopago')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const xSignature = request.headers.get('x-signature');
        
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

        if (resourceId && (action === 'payment.created' || action === 'payment.updated' || topic === 'payment')) {
          const { data: transaction } = await supabaseAdmin
            .from('transactions')
            .select('*, invoices(*)')
            .eq('gateway_reference', resourceId)
            .single();

          if (transaction && transaction.status !== 'completed') {
            await supabaseAdmin.from('transactions').update({ status: 'completed' }).eq('id', transaction.id);
            const { data: invoice } = await supabaseAdmin
              .from('invoices')
              .update({ status: 'paid', paid_at: new Date().toISOString() })
              .eq('id', transaction.invoice_id!)
              .select().single();
            
            if (invoice) {
              await processProvisioning(invoice.id);
              
              // Notificar Admin sobre pagamento recebido
              try {
                const { notifyAdminWhatsApp } = await import("@/lib/whatsapp.server");
                await notifyAdminWhatsApp(
                  `💰 *Pagamento Confirmado (Mercado Pago)*\n\n*Fatura:* #${invoice.id}\n*Valor:* R$ ${invoice.total}\n*Status:* Pago`,
                  "payment_success"
                );
              } catch (e) {
                console.warn("[WhatsApp] Falha ao notificar admin sobre pagamento MP:", e);
              }
            }
          }
        }
        
        return new Response('ok');
      }
    }
  }
});
