import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { processProvisioning } from '@/lib/finance.server';
import { verifyHmacSignature } from '@/lib/webhook-utils.server';

export const Route = createFileRoute('/api/public/webhooks/abacatepay')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get('x-abacatepay-signature');
        const body = await request.text();
        
        // 1. Obter segredo do webhook das configurações
        const { data: setting } = await supabaseAdmin
          .from('system_settings')
          .select('value')
          .eq('key', 'abacatepay_webhook_secret')
          .maybeSingle();

        const webhookSecret = setting?.value as string;

        // 2. Validar assinatura se o segredo estiver configurado
        if (webhookSecret && !verifyHmacSignature(body, signature, webhookSecret)) {
          console.error('[AbacatePay Webhook] Assinatura inválida');
          return new Response('Invalid signature', { status: 401 });
        }
        
        try {
          const payload = JSON.parse(body);
          
          if (payload.event === 'billing.paid' || (payload.data && payload.data.status === 'PAID')) {
            const gatewayRef = payload.data.id;
            
            const { data: transaction } = await supabaseAdmin
              .from('transactions')
              .select('*, invoices(*)')
              .eq('gateway_reference', gatewayRef)
              .single();
              
            if (transaction && transaction.status !== 'completed') {
              await supabaseAdmin
                .from('transactions')
                .update({ status: 'completed' })
                .eq('id', transaction.id);
                
              const { data: invoice } = await supabaseAdmin
                .from('invoices')
                .update({ status: 'paid', paid_at: new Date().toISOString() })
                .eq('id', transaction.invoice_id!)
                .select()
                .single();
                
              if (invoice) {
                await processProvisioning(invoice.id);
                
                // Notificar Admin
                try {
                  const { notifyAdminWhatsApp } = await import("@/lib/whatsapp.server");
                  await notifyAdminWhatsApp(
                    `💰 *Pagamento Confirmado (AbacatePay)*\n\n*Fatura:* #${invoice.id}\n*Valor:* R$ ${invoice.total}\n*Status:* Pago`,
                    "payment_success"
                  );
                } catch (e) {
                  console.warn("[WhatsApp] Falha ao notificar admin sobre pagamento AbacatePay:", e);
                }
              }
            }
          }
          
          return new Response('ok');
        } catch (err: any) {
          console.error('[AbacatePay Webhook] Erro:', err);
          return new Response('error', { status: 500 });
        }
      }
    }
  }
});
