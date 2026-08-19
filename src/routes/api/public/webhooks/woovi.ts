import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { processProvisioning } from '@/lib/finance.server';
import { verifyHmacSignature } from '@/lib/webhook-utils.server';

export const Route = createFileRoute('/api/public/webhooks/woovi')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get('x-openpix-signature'); // Assumindo padrão Woovi/OpenPix
        
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

        try {
          const payload = JSON.parse(body);

          if (payload.event === 'OPENPIX:CHARGE_COMPLETED') {
            const chargeId = payload.charge.correlationID;
            
            const { data: transaction } = await supabaseAdmin
              .from('transactions')
              .select('*, invoices(*)')
              .eq('id', chargeId)
              .single();

            if (transaction && transaction.status !== 'completed') {
              await supabaseAdmin.from('transactions').update({ status: 'completed' }).eq('id', transaction.id);
              const { data: invoice } = await supabaseAdmin
                .from('invoices')
                .update({ status: 'paid', paid_at: new Date().toISOString() })
                .eq('id', transaction.invoice_id!)
                .select().single();
              
              if (invoice) await processProvisioning(invoice.id);
            }
          }
          
          return new Response('ok');
        } catch (err: any) {
          console.error('[Woovi Webhook] Erro:', err.message);
          return new Response('error', { status: 400 });
        }
      }
    }
  }
});
